import { getUserById } from "../../../../_shared/db";
import { serviceCatalog } from "../../../../_shared/permissionCatalog";
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

const knownServices = new Set(serviceCatalog.map((service) => service.key));

function parseServices(input: unknown): { serviceKey: string; status: AccessStatus }[] {
  const payload = input as { services?: unknown };
  if (!Array.isArray(payload.services)) {
    throw new ApiError("VALIDATION_ERROR", "services must be an array.", 400);
  }

  return payload.services.map((item) => {
    const entry = item as { serviceKey?: unknown; status?: unknown };
    const serviceKey = typeof entry.serviceKey === "string" ? entry.serviceKey.trim() : "";
    if (!knownServices.has(serviceKey)) throw new ApiError("VALIDATION_ERROR", `Unknown service: ${serviceKey}`, 400);
    return { serviceKey, status: validateAccessStatus(entry.status) };
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
      catalog: serviceCatalog,
      services: snapshot.services.map((grant) => ({ serviceKey: grant.key, status: grant.status })),
    });
  });

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const target = await getUserById(env.DB, String(params.id || ""));
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);
    assertActorCanManageTarget({ actor, target, action: "permissions" });

    const services = parseServices(await readJson(request));
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM service_access WHERE user_id = ?`).bind(target.id),
      ...services.map((service) =>
        env.DB.prepare(
          `INSERT INTO service_access (id, user_id, service_key, status, granted_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(randomId("svcacc"), target.id, service.serviceKey, service.status, actor.id, now, now),
      ),
    ]);

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "user.services.update",
      resourceType: "service_access",
      resourceId: target.id,
      details: { services },
    });

    const snapshot = await loadAccessSnapshot(env.DB, target);
    return jsonResponse(request, {
      userId: target.id,
      catalog: serviceCatalog,
      services: snapshot.services.map((grant) => ({ serviceKey: grant.key, status: grant.status })),
    });
  });
