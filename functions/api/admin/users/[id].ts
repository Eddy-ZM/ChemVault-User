import { revokeAllUserSessions } from "../../../_shared/auth";
import { getUserById, toPublicUser } from "../../../_shared/db";
import {
  assertActorCanManageTarget,
  loadAccessSnapshot,
  loadUserMailAccount,
  requireAdmin,
  writeAuditLog,
} from "../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../_shared/responses";
import type { AccessStatus, Env, PermissionEffect, SystemRole, UserRole, UserRow, UserStatus } from "../../../_shared/types";
import { permanentlyDeleteUser } from "../../../_shared/userDeletion";
import { validateRole, validateStatus, validateSystemRole } from "../../../_shared/validators";

type DetailGrant = { key: string; effect?: PermissionEffect; status?: AccessStatus | string; created_at?: string };

function cleanText(value: unknown, max = 180): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

async function buildUserDetail(db: D1Database, user: UserRow) {
  const [snapshot, mailAccount, usage, auditRows] = await Promise.all([
    loadAccessSnapshot(db, user),
    loadUserMailAccount(db, user.id),
    db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN service = 'extract' THEN amount ELSE 0 END), 0) AS ai_extraction,
          COALESCE(SUM(CASE WHEN service = 'files' AND action = 'storage_mb' THEN amount ELSE 0 END), 0) AS storage_mb,
          COALESCE(SUM(CASE WHEN action = 'api_request' THEN amount ELSE 0 END), 0) AS api_requests
         FROM usage_logs WHERE user_id = ?`,
      )
      .bind(user.id)
      .first<{ ai_extraction: number; storage_mb: number; api_requests: number }>(),
    db
      .prepare(
        `SELECT id, actor_user_id, target_user_id, action, resource_type, resource_id, details, created_at
         FROM audit_logs
         WHERE target_user_id = ? OR actor_user_id = ?
         ORDER BY created_at DESC
         LIMIT 30`,
      )
      .bind(user.id, user.id)
      .all<{
        id: string;
        actor_user_id: string | null;
        target_user_id: string | null;
        action: string;
        resource_type: string | null;
        resource_id: string | null;
        details: string | null;
        created_at: string;
      }>(),
  ]);

  return {
    user: toPublicUser(user),
    mailAccount,
    permissions: snapshot.userPermissions.map((grant: DetailGrant) => ({ key: grant.key, effect: grant.effect })),
    rolePermissions: snapshot.rolePermissions.map((grant: DetailGrant) => ({ key: grant.key, effect: grant.effect })),
    services: snapshot.services.map((grant: DetailGrant) => ({ serviceKey: grant.key, status: grant.status })),
    pages: snapshot.pages.map((grant: DetailGrant) => ({ pageKey: grant.key, status: grant.status })),
    usage: {
      aiExtractionCreditsUsed: Number(usage?.ai_extraction || 0),
      storageUsedMb: Number(usage?.storage_mb || 0),
      apiRequestsThisMonth: Number(usage?.api_requests || 0),
    },
    auditLogs: (auditRows.results || []).map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      targetUserId: row.target_user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details ? JSON.parse(row.details) : null,
      createdAt: row.created_at,
    })),
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    const target = await getUserById(env.DB, String(params.id || ""));
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);
    return jsonResponse(request, await buildUserDetail(env.DB, target));
  });

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const target = await getUserById(env.DB, String(params.id || ""));
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);

    const payload = (await readJson(request)) as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [];
    let nextRole: UserRole | undefined;
    let nextSystemRole: SystemRole | undefined;
    let nextStatus: UserStatus | undefined;

    if (Object.hasOwn(payload, "role")) {
      nextRole = validateRole(payload.role);
      updates.push("role = ?");
      values.push(nextRole);
    }

    if (Object.hasOwn(payload, "systemRole")) {
      nextSystemRole = validateSystemRole(payload.systemRole);
      updates.push("system_role = ?");
      values.push(nextSystemRole);
    }

    if (Object.hasOwn(payload, "status")) {
      nextStatus = validateStatus(payload.status);
      updates.push("status = ?", "global_status = ?");
      values.push(nextStatus, nextStatus);
    }

    if (Object.hasOwn(payload, "globalStatus")) {
      nextStatus = validateStatus(payload.globalStatus);
      updates.push("global_status = ?");
      values.push(nextStatus);
    }

    if (Object.hasOwn(payload, "name")) {
      const name = cleanText(payload.name, 160);
      if (!name) throw new ApiError("VALIDATION_ERROR", "Name cannot be empty.", 400);
      updates.push("name = ?");
      values.push(name);
    }

    if (Object.hasOwn(payload, "institution")) {
      updates.push("institution = ?");
      values.push(cleanText(payload.institution, 180));
    }

    if (!updates.length) throw new ApiError("VALIDATION_ERROR", "No user fields were provided.", 400);

    assertActorCanManageTarget({
      actor,
      target,
      action: nextSystemRole ? "update_role" : nextStatus && nextStatus !== "active" ? "delete" : "update_status",
      nextSystemRole,
    });

    const now = new Date().toISOString();
    updates.push("updated_at = ?");
    values.push(now, target.id);

    await env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();

    const updated = await getUserById(env.DB, target.id);
    if (!updated) throw new ApiError("VALIDATION_ERROR", "User not found after update.", 404);
    if (nextStatus && nextStatus !== "active") await revokeAllUserSessions(env, updated);

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "user.update",
      resourceType: "user",
      resourceId: target.id,
      details: { role: nextRole, systemRole: nextSystemRole, status: nextStatus },
    });

    return jsonResponse(request, await buildUserDetail(env.DB, updated));
  });

export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const target = await getUserById(env.DB, String(params.id || ""));
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);

    assertActorCanManageTarget({ actor, target, action: "delete" });

    const deletedUser = await permanentlyDeleteUser({
      env,
      request,
      actorUserId: actor.id,
      target,
      action: "admin_delete",
    });

    return jsonResponse(request, { ok: true, deletedUser });
  });
