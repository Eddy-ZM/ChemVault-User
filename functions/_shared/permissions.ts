import { requireUser } from "./auth";
import { publicUserColumns } from "./db";
import { ApiError } from "./responses";
import { randomId } from "./security";
import type {
  AccessSnapshot,
  AccessStatus,
  Env,
  MailAccountRow,
  PermissionEffect,
  PublicMailAccount,
  SystemRole,
  UserRow,
} from "./types";
import {
  isUomMailSystemBootstrapUser,
  isUomMailSystemPermission,
  isUomMailSystemServiceKey,
  uomMailSystemPermission,
  uomMailSystemPermissions,
} from "./uomMailAccess";
import { isUserActive } from "./userStatus";

export type AccessReason =
  | "allowed_by_owner"
  | "allowed_by_super_admin"
  | "allowed_by_user_permission"
  | "allowed_by_role_permission"
  | "allowed_by_bootstrap_identity"
  | "allowed_by_service_access"
  | "allowed_by_page_access"
  | "denied_by_user_permission"
  | "denied_by_role_permission"
  | "user_inactive"
  | "service_disabled"
  | "page_disabled"
  | "missing_permission"
  | "missing_service_access"
  | "missing_page_access";

export interface AccessDecision {
  allowed: boolean;
  reason: AccessReason;
}

export function isMailRoleManagedServiceKey(serviceKey: string): boolean {
  return serviceKey === "chemvault_mail";
}

export function isMailRoleManagedPermissionKey(permissionKey: string): boolean {
  return permissionKey === "service:chemvault_mail:access" || permissionKey.startsWith("mail:");
}

const secretKeys = new Set([
  "password",
  "password_hash",
  "token",
  "token_hash",
  "session",
  "jwt",
  "JWT_SECRET",
  "MAIL_SYSTEM_SYNC_SECRET",
]);

export function isInactiveUser(user: Pick<UserRow, "status" | "global_status">): boolean {
  return !isUserActive(user);
}

export function isSuperUser(user: Pick<UserRow, "system_role" | "source">): boolean {
  return user.system_role === "owner" || user.system_role === "super_admin";
}

export function evaluatePermission(user: UserRow, snapshot: AccessSnapshot, permissionKey: string): AccessDecision {
  if (isInactiveUser(user)) return { allowed: false, reason: "user_inactive" };
  if (isMailRoleManagedPermissionKey(permissionKey)) return { allowed: false, reason: "missing_permission" };

  // These connected-service permissions are deliberately explicit-only. Global
  // owner/super-admin privileges and role-level grants must never confer them.
  if (isUomMailSystemPermission(permissionKey)) {
    if (snapshot.userPermissions.some((grant) => grant.key === permissionKey && grant.effect === "deny")) {
      return { allowed: false, reason: "denied_by_user_permission" };
    }
    if (snapshot.userPermissions.some((grant) => grant.key === permissionKey && grant.effect === "allow")) {
      return { allowed: true, reason: "allowed_by_user_permission" };
    }
    if (isUomMailSystemBootstrapUser(user)) {
      return { allowed: true, reason: "allowed_by_bootstrap_identity" };
    }
    return { allowed: false, reason: "missing_permission" };
  }

  if (user.system_role === "owner") return { allowed: true, reason: "allowed_by_owner" };
  if (user.system_role === "super_admin") return { allowed: true, reason: "allowed_by_super_admin" };

  if (snapshot.userPermissions.some((grant) => grant.key === permissionKey && grant.effect === "deny")) {
    return { allowed: false, reason: "denied_by_user_permission" };
  }
  if (snapshot.rolePermissions.some((grant) => grant.key === permissionKey && grant.effect === "deny")) {
    return { allowed: false, reason: "denied_by_role_permission" };
  }
  if (snapshot.userPermissions.some((grant) => grant.key === permissionKey && grant.effect === "allow")) {
    return { allowed: true, reason: "allowed_by_user_permission" };
  }
  if (snapshot.rolePermissions.some((grant) => grant.key === permissionKey && grant.effect === "allow")) {
    return { allowed: true, reason: "allowed_by_role_permission" };
  }

  return { allowed: false, reason: "missing_permission" };
}

export function canAccessService(user: UserRow, snapshot: AccessSnapshot, serviceKey: string): AccessDecision {
  if (isInactiveUser(user)) return { allowed: false, reason: "user_inactive" };
  if (isMailRoleManagedServiceKey(serviceKey)) return { allowed: false, reason: "missing_permission" };
  if (isUomMailSystemServiceKey(serviceKey)) return evaluatePermission(user, snapshot, uomMailSystemPermission);
  if (isSuperUser(user)) return user.system_role === "owner" ? { allowed: true, reason: "allowed_by_owner" } : { allowed: true, reason: "allowed_by_super_admin" };

  const direct = snapshot.services.find((grant) => grant.key === serviceKey);
  if (direct && direct.status !== "active") return { allowed: false, reason: "service_disabled" };
  if (direct?.status === "active") return { allowed: true, reason: "allowed_by_service_access" };

  return evaluatePermission(user, snapshot, `service:${serviceKey}:access`);
}

export function canAccessPage(user: UserRow, snapshot: AccessSnapshot, pageKey: string): AccessDecision {
  if (isInactiveUser(user)) return { allowed: false, reason: "user_inactive" };
  if (isSuperUser(user)) return user.system_role === "owner" ? { allowed: true, reason: "allowed_by_owner" } : { allowed: true, reason: "allowed_by_super_admin" };

  const direct = snapshot.pages.find((grant) => grant.key === pageKey);
  if (direct && direct.status !== "active") return { allowed: false, reason: "page_disabled" };
  if (direct?.status === "active") return { allowed: true, reason: "allowed_by_page_access" };

  return evaluatePermission(user, snapshot, `page:${pageKey}:view`);
}

export function evaluateAccessCheck(
  user: UserRow,
  snapshot: AccessSnapshot,
  input: { permission?: string | null; service?: string | null; page?: string | null },
): AccessDecision {
  if (input.permission) return evaluatePermission(user, snapshot, input.permission);

  if (input.service) {
    const service = canAccessService(user, snapshot, input.service);
    if (!service.allowed) return service;
    if (!input.page) return service;
  }

  if (input.page) return canAccessPage(user, snapshot, input.page);

  return { allowed: false, reason: "missing_permission" };
}

export async function loadAccessSnapshot(db: D1Database, user: UserRow): Promise<AccessSnapshot> {
  const [rolePermissions, userPermissions, services, pages] = await Promise.all([
    db
      .prepare(`SELECT permission_key AS key, effect FROM role_permissions WHERE system_role = ?`)
      .bind(user.system_role || "user")
      .all<{ key: string; effect: PermissionEffect }>(),
    db
      .prepare(`SELECT permission_key AS key, effect FROM user_permissions WHERE user_id = ?`)
      .bind(user.id)
      .all<{ key: string; effect: PermissionEffect }>(),
    db
      .prepare(`SELECT service_key AS key, status FROM service_access WHERE user_id = ?`)
      .bind(user.id)
      .all<{ key: string; status: AccessStatus }>(),
    db
      .prepare(`SELECT page_key AS key, status FROM page_access WHERE user_id = ?`)
      .bind(user.id)
      .all<{ key: string; status: AccessStatus }>(),
  ]);

  return {
    rolePermissions: (rolePermissions.results || []).filter((grant) => !isMailRoleManagedPermissionKey(grant.key)),
    userPermissions: (userPermissions.results || []).filter((grant) => !isMailRoleManagedPermissionKey(grant.key)),
    services: (services.results || []).filter((grant) => !isMailRoleManagedServiceKey(grant.key)),
    pages: pages.results || [],
  };
}

export async function loadEffectivePermissionKeys(db: D1Database, user: UserRow): Promise<string[]> {
  if (isInactiveUser(user)) return [];
  const snapshot = await loadAccessSnapshot(db, user);
  const allowedUomMailSystemPermissions = uomMailSystemPermissions.filter(
    (permissionKey) => evaluatePermission(user, snapshot, permissionKey).allowed,
  );

  if (isSuperUser(user)) {
    const rows = await db.prepare(`SELECT key FROM permissions ORDER BY key`).all<{ key: string }>();
    const keys = (rows.results || [])
      .map((row) => row.key)
      .filter((key) => !isMailRoleManagedPermissionKey(key) && !isUomMailSystemPermission(key));
    keys.push(...allowedUomMailSystemPermissions);
    return keys.sort();
  }

  const keys = new Set<string>();
  for (const grant of snapshot.rolePermissions) {
    if (grant.effect === "allow" && !isUomMailSystemPermission(grant.key)) keys.add(grant.key);
  }
  for (const grant of snapshot.userPermissions) {
    if (grant.effect === "allow" && !isUomMailSystemPermission(grant.key)) keys.add(grant.key);
    if (grant.effect === "deny") keys.delete(grant.key);
  }
  for (const permissionKey of allowedUomMailSystemPermissions) keys.add(permissionKey);
  return [...keys].sort();
}

export async function loadUserMailAccount(db: D1Database, userId: string): Promise<PublicMailAccount | null> {
  const row = await db
    .prepare(`SELECT * FROM mail_accounts WHERE user_id = ? AND mail_status != 'deleted' ORDER BY created_at DESC LIMIT 1`)
    .bind(userId)
    .first<MailAccountRow>();
  return row ? toPublicMailAccount(row) : null;
}

export async function enrichPublicUser<T extends { id: string }>(db: D1Database, user: T & UserRow) {
  const [permissions, services, pages, mailAccount] = await Promise.all([
    loadEffectivePermissionKeys(db, user),
    db
      .prepare(`SELECT service_key FROM service_access WHERE user_id = ? AND status = 'active' AND service_key != 'chemvault_mail' ORDER BY service_key`)
      .bind(user.id)
      .all<{ service_key: string }>(),
    db
      .prepare(`SELECT page_key FROM page_access WHERE user_id = ? AND status = 'active' ORDER BY page_key`)
      .bind(user.id)
      .all<{ page_key: string }>(),
    loadUserMailAccount(db, user.id),
  ]);

  return {
    permissions,
    services: (services.results || []).map((row) => row.service_key),
    pages: (pages.results || []).map((row) => row.page_key),
    mailAccount,
  };
}

export async function requirePermission(env: Env, request: Request, permissionKey: string) {
  const context = await requireUser(env, request);
  const snapshot = await loadAccessSnapshot(env.DB, context.user);
  const decision = evaluatePermission(context.user, snapshot, permissionKey);
  if (!decision.allowed) throw new ApiError("FORBIDDEN", "Required permission is missing.", 403);
  return { ...context, snapshot, decision };
}

export async function requireAdmin(env: Env, request: Request) {
  const context = await requireUser(env, request);
  if (context.user.role === "admin" || ["admin", "super_admin", "owner"].includes(context.user.system_role)) {
    return context;
  }

  const snapshot = await loadAccessSnapshot(env.DB, context.user);
  const decision = evaluatePermission(context.user, snapshot, "admin:users:view");
  if (!decision.allowed) throw new ApiError("FORBIDDEN", "Admin access is required.", 403);
  return context;
}

export async function requireSuperAdmin(env: Env, request: Request) {
  const context = await requireUser(env, request);
  if (context.user.system_role !== "super_admin" && context.user.system_role !== "owner") {
    throw new ApiError("FORBIDDEN", "Super admin access is required.", 403);
  }
  return context;
}

export function assertActorCanManageTarget(input: {
  actor: UserRow;
  target: UserRow;
  action: "update_role" | "update_status" | "delete" | "permissions" | "mail";
  nextSystemRole?: SystemRole;
}) {
  const { actor, target, action, nextSystemRole } = input;
  const actorIsOwner = actor.system_role === "owner";
  const actorIsSuper = actor.system_role === "super_admin" || actorIsOwner;
  const targetProtected = target.system_role === "owner" || target.system_role === "super_admin";

  if (nextSystemRole === "owner" && !actorIsOwner) {
    throw new ApiError("FORBIDDEN", "Only owner accounts can grant owner access.", 403);
  }

  if (nextSystemRole === "super_admin" && !actorIsSuper) {
    throw new ApiError("FORBIDDEN", "Only super admin or owner accounts can grant super admin access.", 403);
  }

  if (target.system_role === "owner" && nextSystemRole && nextSystemRole !== "owner") {
    throw new ApiError("FORBIDDEN", "Owner accounts cannot be downgraded.", 403);
  }

  if (target.system_role === "owner" && !actorIsOwner) {
    throw new ApiError("FORBIDDEN", "Owner accounts cannot be modified by this actor.", 403);
  }

  if (targetProtected && !actorIsSuper) {
    throw new ApiError("FORBIDDEN", "Super admin or owner access is required for this target.", 403);
  }

  if (actor.id === target.id && (nextSystemRole === "super_admin" || nextSystemRole === "owner") && !actorIsOwner) {
    throw new ApiError("FORBIDDEN", "Admins cannot promote themselves to super admin or owner.", 403);
  }

  if (action === "delete" && target.system_role === "owner") {
    throw new ApiError("FORBIDDEN", "Owner accounts cannot be deleted.", 403);
  }
}

export function makeAuditDetails(details: Record<string, unknown>): string {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (!secretKeys.has(key)) safe[key] = value;
  }
  return JSON.stringify(safe);
}

export async function writeAuditLog(input: {
  env: Env;
  request: Request;
  actorUserId?: string | null;
  targetUserId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown>;
}) {
  await input.env.DB.prepare(
    `INSERT INTO audit_logs (
      id, actor_user_id, target_user_id, action, resource_type, resource_id, details, ip, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      randomId("audit"),
      input.actorUserId || null,
      input.targetUserId || null,
      input.action,
      input.resourceType || null,
      input.resourceId || null,
      input.details ? makeAuditDetails(input.details) : null,
      input.request.headers.get("cf-connecting-ip"),
      input.request.headers.get("user-agent"),
      new Date().toISOString(),
    )
    .run();
}

export function toPublicMailAccount(row: MailAccountRow): PublicMailAccount {
  return {
    id: row.id,
    userId: row.user_id,
    mailAddress: row.mail_address,
    displayName: row.mail_display_name,
    mailRole: row.mail_role,
    mailStatus: row.mail_status,
    canSend: Boolean(row.can_send),
    canReceive: Boolean(row.can_receive),
    canLoginMail: Boolean(row.can_login_mail),
    mailboxQuotaMb: row.mailbox_quota_mb,
    aliases: row.aliases ? JSON.parse(row.aliases) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadAdminUser(db: D1Database, id: string): Promise<UserRow | null> {
  return await db.prepare(`SELECT ${publicUserColumns}, password_hash FROM users WHERE id = ? LIMIT 1`).bind(id).first<UserRow>();
}
