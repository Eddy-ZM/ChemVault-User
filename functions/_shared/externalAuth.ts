import { createSession, sessionCookie } from "./auth";
import { assertUserCanAuthenticate } from "./userStatus";
import { getUserByEmail, getUserById, insertDefaultServices, toPublicUser } from "./db";
import { loadUserMailAccount, toPublicMailAccount, writeAuditLog } from "./permissions";
import { ApiError, jsonResponse } from "./responses";
import { sanitizeReturnTo } from "./returnTo";
import { randomId } from "./security";
import type { Env, ExternalIdentityRow, MailAccountRow, PublicMailAccount, UserRow } from "./types";
import { normalizeEmail, validateEmail } from "./validators";

const encoder = new TextEncoder();
const mailProvider = "chemvault_mail";
const mailCredentialAlgorithm = "mail_sha256_salt_prefix_base64";

export interface MailSsoAssertion {
  email: string;
  name?: string;
  mailUserId?: string;
  iat: string;
  nonce: string;
  signature: string;
  returnTo?: string;
}

export interface MailPasswordAuthResult {
  email: string;
  name: string;
  mailUserId: string | null;
  mailAddress: string;
  mailRole: "mailbox_user" | "mailbox_admin" | "mailbox_super";
  mailStatus: "active" | "disabled" | "suspended" | "deleted";
  canSend: boolean;
  canReceive: boolean;
  canLoginMail: boolean;
  mailboxQuotaMb: number;
  aliases: string[];
}

export async function verifyExternalPassword(db: D1Database, user: UserRow, password: string): Promise<boolean> {
  const identity = await db
    .prepare(
      `SELECT * FROM external_identities
       WHERE user_id = ? AND provider = ? AND credential_algorithm = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(user.id, mailProvider, mailCredentialAlgorithm)
    .first<ExternalIdentityRow>();

  if (!identity?.credential_hash || !identity.credential_salt) return false;
  return await verifyMailPassword(password, identity.credential_salt, identity.credential_hash);
}

export async function verifyMailPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const data = encoder.encode(`${salt}${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const actual = toBase64(new Uint8Array(digest));
  return constantTimeStringEqual(actual, storedHash);
}

export async function verifyMailSystemPassword(
  env: Env,
  email: string,
  password: string,
  fetcher: typeof fetch = fetch,
): Promise<MailPasswordAuthResult | null> {
  const endpoint = buildMailPasswordVerifyUrl(env);
  const secret = env.MAIL_SYSTEM_SSO_SECRET || env.MAIL_SYSTEM_SYNC_SECRET;
  if (!endpoint || !secret) return null;

  let response: Response;
  try {
    response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-chemvault-sso-secret": secret,
      },
      body: JSON.stringify({ email: normalizeEmail(email), password }),
    });
  } catch (error) {
    console.error("Mail password verification request failed", error instanceof Error ? error.message : String(error));
    return null;
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) return null;
  if (!response.ok) {
    console.error("Mail password verification returned an unexpected status", response.status);
    return null;
  }

  const body = await response.json().catch(() => null) as { code?: number; data?: Record<string, unknown> } | null;
  if (!body || body.code !== 200 || !body.data) return null;
  return normalizeMailPasswordAuthResult(body.data);
}

export function buildMailPasswordVerifyUrl(env: Env): string | null {
  if (env.MAIL_SYSTEM_PASSWORD_VERIFY_URL) return env.MAIL_SYSTEM_PASSWORD_VERIFY_URL;
  const source = env.MAIL_SYSTEM_SSO_URL || "https://mail.chemvault.science/api/sso/chemvault-user/authorize";
  try {
    const url = new URL(source);
    return `${url.origin}/api/internal/user-center/password-login`;
  } catch {
    return null;
  }
}

function normalizeMailPasswordAuthResult(data: Record<string, unknown>): MailPasswordAuthResult | null {
  const email = normalizeEmail(String(data.email || ""));
  const mailAddress = normalizeEmail(String(data.mailAddress || data.mail_address || email));
  if (!validateEmail(email) || !validateEmail(mailAddress)) return null;

  const role = data.mailRole || data.mail_role;
  const status = data.mailStatus || data.mail_status;
  const mailRole =
    role === "mailbox_admin" || role === "mailbox_super" || role === "mailbox_user"
      ? role
      : "mailbox_user";
  const mailStatus =
    status === "disabled" || status === "suspended" || status === "deleted" || status === "active"
      ? status
      : "active";
  const aliases = Array.isArray(data.aliases)
    ? data.aliases.filter((item): item is string => typeof item === "string").map((item) => normalizeEmail(item)).filter(validateEmail)
    : [];
  const quota = Number(data.mailboxQuotaMb || data.mailbox_quota_mb || 1024);

  return {
    email,
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim().slice(0, 160) : email.split("@")[0] || email,
    mailUserId: typeof data.mailUserId === "string" ? data.mailUserId : typeof data.mail_user_id === "string" ? data.mail_user_id : null,
    mailAddress,
    mailRole,
    mailStatus,
    canSend: data.canSend !== false && data.can_send !== false,
    canReceive: data.canReceive !== false && data.can_receive !== false,
    canLoginMail: data.canLoginMail !== false && data.can_login_mail !== false,
    mailboxQuotaMb: Number.isInteger(quota) && quota >= 0 ? quota : 1024,
    aliases,
  };
}

export async function getMailSsoSecret(env: Env): Promise<string> {
  const secret = env.MAIL_SYSTEM_SSO_SECRET || env.MAIL_SYSTEM_SYNC_SECRET;
  if (!secret) throw new ApiError("SSO_NOT_CONFIGURED", "Mail SSO secret is not configured.", 501);
  return secret;
}

export async function verifyMailSsoAssertion(env: Env, assertion: MailSsoAssertion): Promise<{
  email: string;
  name: string;
  mailUserId: string | null;
  returnTo: string;
}> {
  const email = normalizeEmail(assertion.email || "");
  if (!validateEmail(email)) throw new ApiError("INVALID_SSO_ASSERTION", "Mail SSO email is invalid.", 401);

  const iat = Number(assertion.iat);
  if (!Number.isInteger(iat)) throw new ApiError("INVALID_SSO_ASSERTION", "Mail SSO timestamp is invalid.", 401);
  if (Math.abs(Date.now() - iat) > 5 * 60 * 1000) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Mail SSO assertion has expired.", 401);
  }

  const nonce = typeof assertion.nonce === "string" ? assertion.nonce.trim() : "";
  const mailUserId = typeof assertion.mailUserId === "string" ? assertion.mailUserId.trim() : "";
  const name = typeof assertion.name === "string" && assertion.name.trim() ? assertion.name.trim().slice(0, 160) : email;
  const returnTo = sanitizeReturnTo(assertion.returnTo);
  if (!nonce || !assertion.signature) throw new ApiError("INVALID_SSO_ASSERTION", "Mail SSO assertion is incomplete.", 401);

  const expected = await signMailSsoAssertion(await getMailSsoSecret(env), {
    email,
    name,
    mailUserId,
    iat: String(iat),
    nonce,
  });
  if (!constantTimeStringEqual(expected, assertion.signature)) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Mail SSO signature is invalid.", 401);
  }

  return { email, name, mailUserId: mailUserId || null, returnTo };
}

export async function signMailSsoAssertion(
  secret: string,
  input: { email: string; name: string; mailUserId?: string | null; iat: string; nonce: string },
): Promise<string> {
  const canonical = [
    normalizeEmail(input.email),
    input.mailUserId || "",
    input.name.trim(),
    input.iat,
    input.nonce,
  ].join("\n");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonical));
  return toBase64Url(new Uint8Array(signature));
}

export async function findUserByMailIdentity(db: D1Database, email: string, mailUserId?: string | null): Promise<UserRow | null> {
  if (mailUserId) {
    const row = await db
      .prepare(
        `SELECT user_id FROM external_identities
         WHERE provider = ? AND provider_user_id = ?
         LIMIT 1`,
      )
      .bind(mailProvider, mailUserId)
      .first<{ user_id: string }>();
    if (row?.user_id) return await getUserById(db, row.user_id);
  }

  const identity = await db
    .prepare(
      `SELECT user_id FROM external_identities
       WHERE provider = ? AND provider_email = ?
       LIMIT 1`,
    )
    .bind(mailProvider, email)
    .first<{ user_id: string }>();
  if (identity?.user_id) return await getUserById(db, identity.user_id);

  return await getUserByEmail(db, email);
}

export async function upsertMailSsoUser(env: Env, assertion: { email: string; name: string; mailUserId: string | null }): Promise<UserRow> {
  const now = new Date().toISOString();
  let user = await findUserByMailIdentity(env.DB, assertion.email, assertion.mailUserId);

  if (!user) {
    const id = randomId("user");
    await env.DB.prepare(
      `INSERT INTO users (
        id, email, password_hash, name, avatar_url, institution, field_of_interest,
        bio, website, role, system_role, source, global_status, status, created_at, updated_at, last_login_at
      ) VALUES (?, ?, 'mail_system_sso_only', ?, NULL, NULL, NULL, NULL, NULL, 'free', 'user', 'mail_system', 'active', 'active', ?, ?, NULL)`,
    )
      .bind(id, assertion.email, assertion.name, now, now)
      .run();
    await insertDefaultServices(env.DB, id, now);
    user = await getUserById(env.DB, id);
  } else {
    await env.DB.prepare(
      `UPDATE users
       SET name = COALESCE(NULLIF(name, ''), ?),
        source = CASE WHEN source = 'local' THEN source ELSE 'mail_system' END,
        updated_at = ?
       WHERE id = ?`,
    )
      .bind(assertion.name, now, user.id)
      .run();
    user = await getUserById(env.DB, user.id);
  }

  if (!user) throw new ApiError("INTERNAL_ERROR", "Mail SSO user could not be loaded.", 500);

  await upsertMailIdentity(env.DB, {
    userId: user.id,
    email: assertion.email,
    mailUserId: assertion.mailUserId,
    now,
  });

  await upsertDefaultMailAccount(env.DB, user, assertion.name, now);
  return user;
}

export async function bindVerifiedMailAccount(input: {
  env: Env;
  request: Request;
  user: UserRow;
  mail: MailPasswordAuthResult;
}): Promise<PublicMailAccount> {
  const mailAddress = normalizeEmail(input.mail.mailAddress || input.mail.email);
  if (!validateEmail(mailAddress) || !mailAddress.endsWith("@chemvault.science")) {
    throw new ApiError("VALIDATION_ERROR", "A valid @chemvault.science mailbox is required.", 400);
  }
  const existingForUser = await loadUserMailAccount(input.env.DB, input.user.id);
  if (existingForUser && existingForUser.mailAddress !== mailAddress) {
    throw new ApiError("VALIDATION_ERROR", "This ChemVault account already has a different mailbox.", 409);
  }

  const existingByAddress = await input.env.DB.prepare(`SELECT * FROM mail_accounts WHERE mail_address = ? LIMIT 1`)
    .bind(mailAddress)
    .first<MailAccountRow>();
  if (existingByAddress && existingByAddress.user_id !== input.user.id) {
    throw new ApiError("VALIDATION_ERROR", "This mailbox is already bound to another ChemVault account.", 409);
  }

  await assertMailIdentityAvailable(input.env.DB, input.user.id, input.mail);

  const now = new Date().toISOString();
  await upsertBoundMailIdentity(input.env.DB, input.user.id, input.mail, now);
  const row = await upsertBoundMailAccount(input.env.DB, input.user.id, input.mail, now, existingByAddress || null);

  await writeAuditLog({
    env: input.env,
    request: input.request,
    actorUserId: input.user.id,
    targetUserId: input.user.id,
    action: "mail_account.bind",
    resourceType: "mail_account",
    resourceId: row.id,
    details: {
      mailAddress,
      mailUserId: input.mail.mailUserId,
      mailRole: input.mail.mailRole,
      mailStatus: input.mail.mailStatus,
      mailRuntimeAuthority: "mail_role",
    },
  });

  return toPublicMailAccount(row);
}

export async function completeSsoLogin(input: {
  env: Env;
  request: Request;
  user: UserRow;
  returnTo?: string;
}): Promise<Response> {
  assertUserCanAuthenticate(input.user);

  const now = new Date().toISOString();
  await input.env.DB.prepare(`UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`)
    .bind(now, now, input.user.id)
    .run();
  input.user.last_login_at = now;
  input.user.updated_at = now;

  const session = await createSession({ env: input.env, request: input.request, userId: input.user.id });
  const headers = new Headers({
    "Set-Cookie": sessionCookie(input.env, input.request, session.token, session.expiresAt),
  });

  const accept = input.request.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    headers.set("Location", sanitizeReturnTo(input.returnTo));
    return new Response(null, { status: 302, headers });
  }

  return jsonResponse(input.request, { user: toPublicUser(input.user), returnTo: sanitizeReturnTo(input.returnTo) }, { headers });
}

async function upsertMailIdentity(
  db: D1Database,
  input: { userId: string; email: string; mailUserId?: string | null; now: string },
) {
  await db
    .prepare(
      `INSERT INTO external_identities (
        id, user_id, provider, provider_user_id, provider_email, credential_hash,
        credential_salt, credential_algorithm, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)
      ON CONFLICT(provider, provider_email) DO UPDATE SET
        user_id = excluded.user_id,
        provider_user_id = COALESCE(excluded.provider_user_id, external_identities.provider_user_id),
        updated_at = excluded.updated_at`,
    )
    .bind(randomId("ext"), input.userId, mailProvider, input.mailUserId || null, input.email, input.now, input.now)
    .run();
}

async function assertMailIdentityAvailable(db: D1Database, userId: string, mail: MailPasswordAuthResult): Promise<void> {
  if (mail.mailUserId) {
    const existingByUserId = await db
      .prepare(`SELECT user_id FROM external_identities WHERE provider = ? AND provider_user_id = ? LIMIT 1`)
      .bind(mailProvider, mail.mailUserId)
      .first<{ user_id: string }>();
    if (existingByUserId?.user_id && existingByUserId.user_id !== userId) {
      throw new ApiError("VALIDATION_ERROR", "This ChemVault Mail identity is already linked to another account.", 409);
    }
  }

  const existingByEmail = await db
    .prepare(`SELECT user_id FROM external_identities WHERE provider = ? AND provider_email = ? LIMIT 1`)
    .bind(mailProvider, normalizeEmail(mail.mailAddress || mail.email))
    .first<{ user_id: string }>();
  if (existingByEmail?.user_id && existingByEmail.user_id !== userId) {
    throw new ApiError("VALIDATION_ERROR", "This ChemVault Mail address is already linked to another account.", 409);
  }
}

async function upsertBoundMailIdentity(db: D1Database, userId: string, mail: MailPasswordAuthResult, now: string): Promise<void> {
  const metadata = JSON.stringify({
    source: "mail_password_binding",
    mailRole: mail.mailRole,
    mailStatus: mail.mailStatus,
  });
  const providerEmail = normalizeEmail(mail.mailAddress || mail.email);

  await db
    .prepare(
      `INSERT OR IGNORE INTO external_identities (
        id, user_id, provider, provider_user_id, provider_email, credential_hash,
        credential_salt, credential_algorithm, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
    )
    .bind(randomId("ext"), userId, mailProvider, mail.mailUserId || null, providerEmail, metadata, now, now)
    .run();

  await db
    .prepare(
      `UPDATE external_identities
       SET user_id = ?,
        provider_user_id = COALESCE(?, provider_user_id),
        metadata = ?,
        updated_at = ?
       WHERE provider = ? AND provider_email = ?`,
    )
    .bind(userId, mail.mailUserId || null, metadata, now, mailProvider, providerEmail)
    .run();

  if (mail.mailUserId) {
    await db
      .prepare(
        `UPDATE external_identities
         SET user_id = ?,
          provider_email = ?,
          metadata = ?,
          updated_at = ?
         WHERE provider = ? AND provider_user_id = ?`,
      )
      .bind(userId, providerEmail, metadata, now, mailProvider, mail.mailUserId)
      .run();
  }
}

async function upsertBoundMailAccount(
  db: D1Database,
  userId: string,
  mail: MailPasswordAuthResult,
  now: string,
  existing: MailAccountRow | null,
): Promise<MailAccountRow> {
  const mailAddress = normalizeEmail(mail.mailAddress || mail.email);
  const displayName = mail.name || mailAddress.split("@")[0] || mailAddress;
  const aliases = JSON.stringify(mail.aliases || []);

  if (existing) {
    await db
      .prepare(
        `UPDATE mail_accounts
         SET user_id = ?,
          mail_display_name = ?,
          mail_role = ?,
          mail_status = ?,
          can_send = ?,
          can_receive = ?,
          can_login_mail = ?,
          mailbox_quota_mb = ?,
          aliases = ?,
          updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        userId,
        displayName,
        mail.mailRole,
        mail.mailStatus,
        1,
        1,
        1,
        mail.mailboxQuotaMb,
        aliases,
        now,
        existing.id,
      )
      .run();
    const row = await db.prepare(`SELECT * FROM mail_accounts WHERE id = ? LIMIT 1`).bind(existing.id).first<MailAccountRow>();
    if (!row) throw new ApiError("INTERNAL_ERROR", "Bound mail account could not be loaded.", 500);
    return row;
  }

  const id = randomId("mail");
  await db
    .prepare(
      `INSERT INTO mail_accounts (
        id, user_id, mail_address, mail_display_name, mail_role, mail_status,
        can_send, can_receive, can_login_mail, mailbox_quota_mb, aliases, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      userId,
      mailAddress,
      displayName,
      mail.mailRole,
      mail.mailStatus,
      1,
      1,
      1,
      mail.mailboxQuotaMb,
      aliases,
      now,
      now,
    )
    .run();

  const row = await db.prepare(`SELECT * FROM mail_accounts WHERE id = ? LIMIT 1`).bind(id).first<MailAccountRow>();
  if (!row) throw new ApiError("INTERNAL_ERROR", "Bound mail account could not be loaded.", 500);
  return row;
}

async function upsertDefaultMailAccount(db: D1Database, user: UserRow, displayName: string, now: string) {
  const existing = await loadUserMailAccount(db, user.id);
  if (existing) return;

  const row = await db
    .prepare(`SELECT * FROM mail_accounts WHERE mail_address = ? LIMIT 1`)
    .bind(user.email)
    .first<MailAccountRow>();
  if (row) return toPublicMailAccount(row);

  await db
    .prepare(
      `INSERT INTO mail_accounts (
        id, user_id, mail_address, mail_display_name, mail_role, mail_status,
        can_send, can_receive, can_login_mail, mailbox_quota_mb, aliases, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'mailbox_user', 'active', 1, 1, 1, 1024, '[]', ?, ?)`,
    )
    .bind(randomId("mail"), user.id, user.email, displayName, now, now)
    .run();
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}
