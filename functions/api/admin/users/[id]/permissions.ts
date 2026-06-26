import { getUserById } from "../../../../_shared/db";
import {
  assertActorCanManageTarget,
  loadAccessSnapshot,
  loadEffectivePermissionKeys,
  requireAdmin,
  writeAuditLog,
} from "../../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../../_shared/responses";
import { randomId } from "../../../../_shared/security";
import type { Env, PermissionDefinition, PermissionEffect } from "../../../../_shared/types";
import { validatePermissionEffect } from "../../../../_shared/validators";

function parsePermissionList(input: unknown): { key: string; effect: PermissionEffect }[] {
  const payload = input as { permissions?: unknown };
  if (!Array.isArray(payload.permissions)) {
    throw new ApiError("VALIDATION_ERROR", "permissions must be an array.", 400);
  }

  return payload.permissions
    .map((item) => item as { key?: unknown; effect?: unknown })
    .filter((item) => item.effect !== "inherit")
    .map((item) => {
      const key = typeof item.key === "string" ? item.key.trim() : "";
      if (!key) throw new ApiError("VALIDATION_ERROR", "Permission key is required.", 400);
      return { key, effect: validatePermissionEffect(item.effect) };
    });
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    const target = await getUserById(env.DB, String(params.id || ""));
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);

    const [snapshot, effective, definitions] = await Promise.all([
      loadAccessSnapshot(env.DB, target),
      loadEffectivePermissionKeys(env.DB, target),
      env.DB.prepare(`SELECT * FROM permissions ORDER BY category, key`).all<PermissionDefinition>(),
    ]);

    return jsonResponse(request, {
      userId: target.id,
      systemRole: target.system_role,
      permissions: snapshot.userPermissions,
      rolePermissions: snapshot.rolePermissions,
      effectivePermissions: effective,
      definitions: definitions.results || [],
    });
  });

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const target = await getUserById(env.DB, String(params.id || ""));
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);
    assertActorCanManageTarget({ actor, target, action: "permissions" });

    const permissions = parsePermissionList(await readJson(request));
    const now = new Date().toISOString();
    const knownRows = await env.DB.prepare(`SELECT key FROM permissions`).all<{ key: string }>();
    const known = new Set((knownRows.results || []).map((row) => row.key));

    for (const permission of permissions) {
      if (!known.has(permission.key)) {
        throw new ApiError("VALIDATION_ERROR", `Unknown permission: ${permission.key}`, 400);
      }
    }

    await env.DB.batch([
      env.DB.prepare(`DELETE FROM user_permissions WHERE user_id = ?`).bind(target.id),
      ...permissions.map((permission) =>
        env.DB.prepare(
          `INSERT INTO user_permissions (id, user_id, permission_key, effect, granted_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(randomId("uperm"), target.id, permission.key, permission.effect, actor.id, now),
      ),
    ]);

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "user.permissions.update",
      resourceType: "user_permissions",
      resourceId: target.id,
      details: { permissions },
    });

    const snapshot = await loadAccessSnapshot(env.DB, target);
    const effectivePermissions = await loadEffectivePermissionKeys(env.DB, target);
    return jsonResponse(request, {
      userId: target.id,
      permissions: snapshot.userPermissions,
      rolePermissions: snapshot.rolePermissions,
      effectivePermissions,
    });
  });
