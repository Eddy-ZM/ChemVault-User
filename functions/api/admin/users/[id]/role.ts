import { getUserById, toPublicUser } from "../../../../_shared/db";
import { assertActorCanManageTarget, requireAdmin, writeAuditLog } from "../../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";
import { validateRole } from "../../../../_shared/validators";

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const id = String(params.id || "");
    const payload = (await readJson(request)) as { role?: unknown };
    const role = validateRole(payload.role);
    const now = new Date().toISOString();
    const target = await getUserById(env.DB, id);
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);

    assertActorCanManageTarget({ actor, target, action: "update_role" });

    await env.DB.prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id = ?`).bind(role, now, id).run();
    const user = await getUserById(env.DB, id);
    if (!user) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: id,
      action: "user.role.update",
      resourceType: "user",
      resourceId: id,
      details: { role },
    });

    return jsonResponse(request, { user: toPublicUser(user) });
  });
