import { getUserById } from "../../../../_shared/db";
import { pageCatalog } from "../../../../_shared/permissionCatalog";
import {
  assertActorCanManageTarget,
  loadAccessSnapshot,
  requireAdmin,
  writeAuditLog,
} from "../../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../../_shared/responses";
import { randomId } from "../../../../_shared/security";
import type { AccessStatus, Env } from "../../../../_shared/types";
import { validateAccessStatus } from "../../../../_shared/validators";

const knownPages = new Set(pageCatalog.map((page) => page.key));

function parsePages(input: unknown): { pageKey: string; status: AccessStatus }[] {
  const payload = input as { pages?: unknown };
  if (!Array.isArray(payload.pages)) throw new ApiError("VALIDATION_ERROR", "pages must be an array.", 400);

  return payload.pages.map((item) => {
    const entry = item as { pageKey?: unknown; status?: unknown };
    const pageKey = typeof entry.pageKey === "string" ? entry.pageKey.trim() : "";
    if (!knownPages.has(pageKey)) throw new ApiError("VALIDATION_ERROR", `Unknown page: ${pageKey}`, 400);
    return { pageKey, status: validateAccessStatus(entry.status) };
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    const target = await getUserById(env.DB, String(params.id || ""));
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);
    const snapshot = await loadAccessSnapshot(env.DB, target);
    return jsonResponse(request, {
      userId: target.id,
      catalog: pageCatalog,
      pages: snapshot.pages.map((grant) => ({ pageKey: grant.key, status: grant.status })),
    });
  });

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const target = await getUserById(env.DB, String(params.id || ""));
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);
    assertActorCanManageTarget({ actor, target, action: "permissions" });

    const pages = parsePages(await readJson(request));
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM page_access WHERE user_id = ?`).bind(target.id),
      ...pages.map((page) =>
        env.DB.prepare(
          `INSERT INTO page_access (id, user_id, page_key, status, granted_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(randomId("pageacc"), target.id, page.pageKey, page.status, actor.id, now, now),
      ),
    ]);

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "user.pages.update",
      resourceType: "page_access",
      resourceId: target.id,
      details: { pages },
    });

    const snapshot = await loadAccessSnapshot(env.DB, target);
    return jsonResponse(request, {
      userId: target.id,
      catalog: pageCatalog,
      pages: snapshot.pages.map((grant) => ({ pageKey: grant.key, status: grant.status })),
    });
  });
