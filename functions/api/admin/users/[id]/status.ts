import { revokeAllUserSessions } from "../../../../_shared/auth";
import { getUserById, toPublicUser } from "../../../../_shared/db";
import { assertActorCanManageTarget, requireAdmin, writeAuditLog } from "../../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";
import { validateStatus } from "../../../../_shared/validators";

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const id = String(params.id || "");
    const payload = (await readJson(request)) as { status?: unknown };
    const status = validateStatus(payload.status);
    if (status === "deletion_pending" || status === "deleted") {
      throw new ApiError("VALIDATION_ERROR", "Use the deletion endpoint for deletion lifecycle states.", 409);
    }
    const now = new Date().toISOString();
    const target = await getUserById(env.DB, id);
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);

    assertActorCanManageTarget({ actor, target, action: "update_status" });

    await env.DB.prepare(`UPDATE users SET status = ?, global_status = ?, updated_at = ? WHERE id = ?`)
      .bind(status, status, now, id)
      .run();
    const user = await getUserById(env.DB, id);
    if (!user) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);
    if (status !== "active") await revokeAllUserSessions(env, user);

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: id,
      action: "user.status.update",
      resourceType: "user",
      resourceId: id,
      details: { status },
    });

    return jsonResponse(request, { user: toPublicUser(user) });
  });
