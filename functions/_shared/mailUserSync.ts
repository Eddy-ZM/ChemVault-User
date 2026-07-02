import { getUserByEmail, insertDefaultServices, toPublicUser } from "./db";
import { toPublicMailAccount, writeAuditLog } from "./permissions";
import { ApiError } from "./responses";
import { hashPassword, randomId, timingSafeEqualString } from "./security";
import type { Env, MailAccountRow, MailRole, MailStatus, PublicMailAccount, PublicUser, UserRow } from "./types";
import { cleanOptionalText, normalizeEmail, validateEmail, validateMailRole, validateMailStatus } from "./validators";

export interface MailUserSyncPayload {
  primaryEmail: string;
  name: string;
  mailAddress: string;
  displayName: string | null;
  mailRole: MailRole;
  mailStatus: MailStatus;
  canSend: boolean;
  canReceive: boolean;
  canLoginMail: boolean;
  mailboxQuotaMb: number;
  aliases: string[];
  sourceUserId: string | null;
}

export interface MailUserSyncResult {
  action: "created" | "updated";
  user: PublicUser;
  mailAccount: PublicMailAccount;
}

const secretHeader = "x-chemvault-sync-secret";

export async function requireMailSyncSecret(env: Env, request: Request): Promise<void> {
  const expectedSecrets = [env.MAIL_SYSTEM_SYNC_SECRET, env.MAIL_SYSTEM_SSO_SECRET].filter((value): value is string => Boolean(value));
  if (!expectedSecrets.length) throw new ApiError("FORBIDDEN", "Mail system sync is not configured.", 403);

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  const actual = request.headers.get(secretHeader) || bearer;
  if (!actual) throw new ApiError("UNAUTHORIZED", "Mail system sync secret is required.", 401);

  const matches = await Promise.all(expectedSecrets.map((expected) => timingSafeEqualString(actual, expected)));
  if (!matches.some(Boolean)) {
    throw new ApiError("FORBIDDEN", "Mail system sync secret is invalid.", 403);
  }
}

export function parseMailUserSyncPayload(input: unknown): MailUserSyncPayload {
  const payload = input as Record<string, unknown>;
  const primaryEmail = normalizeEmail(String(payload.primaryEmail || payload.email || ""));
  const mailAddress = normalizeEmail(String(payload.mailAddress || payload.mail_address || primaryEmail));
  const name = cleanOptionalText(payload.name, 160) || cleanOptionalText(payload.displayName, 160) || mailAddress.split("@")[0] || mailAddress;
  const displayName = cleanOptionalText(payload.displayName || payload.mailDisplayName, 160) || name;
  const mailboxQuotaMb = Number(payload.mailboxQuotaMb ?? payload.mailbox_quota_mb ?? 1024);
  const mailRole = validateMailRole(payload.mailRole || payload.mail_role || "mailbox_user");
  const mailStatus = validateMailStatus(payload.mailStatus || payload.mail_status || "active");

  if (!validateEmail(primaryEmail)) throw new ApiError("VALIDATION_ERROR", "A valid primaryEmail is required.", 400);
  if (!validateEmail(mailAddress)) throw new ApiError("VALIDATION_ERROR", "A valid mailAddress is required.", 400);
  if (!Number.isInteger(mailboxQuotaMb) || mailboxQuotaMb < 0) {
    throw new ApiError("VALIDATION_ERROR", "mailboxQuotaMb must be a non-negative integer.", 400);
  }

  return {
    primaryEmail,
    name,
    mailAddress,
    displayName,
    mailRole,
    mailStatus,
    canSend: booleanValue(payload.canSend ?? payload.can_send, true),
    canReceive: booleanValue(payload.canReceive ?? payload.can_receive, true),
    canLoginMail: booleanValue(payload.canLoginMail ?? payload.can_login_mail, true),
    mailboxQuotaMb,
    aliases: parseAliases(payload.aliases),
    sourceUserId: cleanOptionalText(payload.sourceUserId || payload.mailUserId || payload.mail_user_id, 120),
  };
}

export async function syncMailUser(env: Env, request: Request, payload: MailUserSyncPayload): Promise<MailUserSyncResult> {
  const now = new Date().toISOString();
  const existing = await getUserByEmail(env.DB, payload.primaryEmail);
  const user = existing ? await updateSyncedUser(env, existing, payload, now) : await createSyncedUser(env, payload, now);
  const mailAccount = await upsertMailAccount(env, user.id, payload, now);

  await writeAuditLog({
    env,
    request,
    actorUserId: null,
    targetUserId: user.id,
    action: "mail_system.user_sync",
    resourceType: "mail_account",
    resourceId: mailAccount.id,
    details: {
      source: "mail_system",
      sourceUserId: payload.sourceUserId,
      primaryEmail: payload.primaryEmail,
      mailAddress: payload.mailAddress,
      mailRole: payload.mailRole,
      mailStatus: payload.mailStatus,
      authorizationSource: "user_system",
      action: existing ? "updated" : "created",
    },
  });

  return {
    action: existing ? "updated" : "created",
    user: toPublicUser(user),
    mailAccount: toPublicMailAccount(mailAccount),
  };
}

async function createSyncedUser(env: Env, payload: MailUserSyncPayload, now: string): Promise<UserRow> {
  const user: UserRow = {
    id: randomId("user"),
    email: payload.primaryEmail,
    password_hash: await hashPassword(`${randomId("mail_sso")}.${randomId("secret")}`),
    name: payload.name,
    avatar_url: null,
    institution: null,
    field_of_interest: null,
    bio: null,
    website: null,
    role: "free",
    system_role: "user",
    source: "mail_system",
    global_status: "active",
    status: "active",
    created_at: now,
    updated_at: now,
    last_login_at: null,
  };

  await env.DB.prepare(
    `INSERT INTO users (
      id, email, password_hash, name, avatar_url, institution, field_of_interest,
      bio, website, role, system_role, source, global_status, status, created_at, updated_at, last_login_at
    ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, 'mail_system', ?, ?, ?, ?, NULL)`,
  )
    .bind(user.id, user.email, user.password_hash, user.name, user.role, user.system_role, user.global_status, user.status, now, now)
    .run();
  await insertDefaultServices(env.DB, user.id, now);
  return user;
}

async function updateSyncedUser(
  env: Env,
  existing: UserRow,
  payload: MailUserSyncPayload,
  now: string,
): Promise<UserRow> {
  await env.DB.prepare(
    `UPDATE users
     SET name = CASE
        WHEN source = 'mail_system' OR name = '' OR name = email THEN ?
        ELSE name
      END,
      updated_at = ?
     WHERE id = ?`,
  )
    .bind(payload.name, now, existing.id)
    .run();

  const updated = await env.DB.prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`).bind(existing.id).first<UserRow>();
  if (!updated) throw new ApiError("INTERNAL_ERROR", "Synced user could not be loaded.", 500);
  return updated;
}

async function upsertMailAccount(env: Env, userId: string, payload: MailUserSyncPayload, now: string): Promise<MailAccountRow> {
  const existing = await env.DB.prepare(`SELECT * FROM mail_accounts WHERE mail_address = ? LIMIT 1`)
    .bind(payload.mailAddress)
    .first<MailAccountRow>();

  if (existing && existing.user_id !== userId) {
    throw new ApiError("VALIDATION_ERROR", "Mail address is already bound to another user.", 409);
  }

  if (existing) {
    await env.DB.prepare(
      `UPDATE mail_accounts
       SET mail_display_name = ?, mail_role = ?, mail_status = ?, can_send = ?, can_receive = ?,
        can_login_mail = ?, mailbox_quota_mb = ?, aliases = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        payload.displayName,
        "mailbox_user",
        payload.mailStatus,
        1,
        1,
        1,
        payload.mailboxQuotaMb,
        JSON.stringify(payload.aliases),
        now,
        existing.id,
      )
      .run();
    const row = await env.DB.prepare(`SELECT * FROM mail_accounts WHERE id = ? LIMIT 1`).bind(existing.id).first<MailAccountRow>();
    if (!row) throw new ApiError("INTERNAL_ERROR", "Synced mail account could not be loaded.", 500);
    return row;
  }

  const id = randomId("mail");
  await env.DB.prepare(
    `INSERT INTO mail_accounts (
      id, user_id, mail_address, mail_display_name, mail_role, mail_status,
      can_send, can_receive, can_login_mail, mailbox_quota_mb, aliases, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      payload.mailAddress,
      payload.displayName,
      "mailbox_user",
      payload.mailStatus,
      1,
      1,
      1,
      payload.mailboxQuotaMb,
      JSON.stringify(payload.aliases),
      now,
      now,
    )
    .run();

  const row = await env.DB.prepare(`SELECT * FROM mail_accounts WHERE id = ? LIMIT 1`).bind(id).first<MailAccountRow>();
  if (!row) throw new ApiError("INTERNAL_ERROR", "Synced mail account could not be loaded.", 500);
  return row;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function parseAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeEmail(item))
    .filter((item) => validateEmail(item))
    .slice(0, 20);
}
