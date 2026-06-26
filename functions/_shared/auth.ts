import { ApiError } from "./responses";
import { createSessionJwt, randomId, sha256Hex, verifySessionJwt } from "./security";
import { getUserById } from "./db";
import type { AuthContext, Env, UserRow } from "./types";

const sessionDays = 30;

export function getCookieName(env: Env): string {
  return env.COOKIE_NAME || "chemvault_session";
}

export function getJwtSecret(env: Env): string {
  if (!env.JWT_SECRET) {
    throw new ApiError("INTERNAL_ERROR", "JWT_SECRET is not configured.", 500);
  }
  return env.JWT_SECRET;
}

export function parseCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return cookies;

  for (const pair of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) continue;
    cookies.set(rawKey, decodeURIComponent(rawValue.join("=")));
  }

  return cookies;
}

export async function createSession(input: {
  env: Env;
  request: Request;
  userId: string;
  remember?: boolean;
}): Promise<{ token: string; sessionId: string; expiresAt: string }> {
  const sessionId = randomId("sess");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();
  const token = await createSessionJwt({
    secret: getJwtSecret(input.env),
    sessionId,
    userId: input.userId,
    expiresAt,
  });
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();

  await input.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      sessionId,
      input.userId,
      tokenHash,
      now,
      expiresAt,
      input.request.headers.get("user-agent"),
      input.request.headers.get("cf-connecting-ip"),
    )
    .run();

  return { token, sessionId, expiresAt };
}

export function sessionCookie(env: Env, request: Request, token: string, expiresAt: string): string {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return buildCookie(env, request, token, `Max-Age=${maxAge}`);
}

export function clearSessionCookie(env: Env, request: Request): string {
  return buildCookie(env, request, "", "Max-Age=0");
}

export async function getAuthContext(env: Env, request: Request): Promise<AuthContext | null> {
  const token = parseCookies(request).get(getCookieName(env));
  if (!token) return null;

  const payload = await verifySessionJwt(token, getJwtSecret(env));
  if (!payload) return null;

  const tokenHash = await sha256Hex(token);
  const session = await env.DB.prepare(
    `SELECT id, user_id, expires_at FROM sessions WHERE id = ? AND token_hash = ? LIMIT 1`,
  )
    .bind(payload.sid, tokenHash)
    .first<{ id: string; user_id: string; expires_at: string }>();

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;
  const user = await getUserById(env.DB, session.user_id);
  if (
    !user ||
    user.status === "deleted" ||
    user.status === "disabled" ||
    user.global_status === "deleted" ||
    user.global_status === "disabled"
  ) {
    return null;
  }

  return { user, sessionId: payload.sid, tokenHash };
}

export async function requireUser(env: Env, request: Request): Promise<AuthContext> {
  const context = await getAuthContext(env, request);
  if (!context) throw new ApiError("UNAUTHORIZED", "Authentication is required.", 401);
  return context;
}

export async function requireAdmin(env: Env, request: Request): Promise<AuthContext> {
  const context = await requireUser(env, request);
  if (!["admin", "super_admin", "owner"].includes(context.user.system_role) && context.user.role !== "admin") {
    throw new ApiError("FORBIDDEN", "Admin access is required.", 403);
  }
  return context;
}

export async function revokeSession(env: Env, sessionId: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
}

export async function revokeAllUserSessions(env: Env, user: UserRow): Promise<void> {
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(user.id).run();
}

function buildCookie(env: Env, request: Request, value: string, maxAgePart: string): string {
  const secure = env.NODE_ENV === "production" || new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${getCookieName(env)}=${encodeURIComponent(value)}; ${maxAgePart}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}
