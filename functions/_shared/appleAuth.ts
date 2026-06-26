import { completeSsoLogin } from "./externalAuth";
import { getJwtSecret } from "./auth";
import { getUserByEmail, getUserById, insertDefaultServices } from "./db";
import { ApiError } from "./responses";
import { randomId } from "./security";
import type { Env, UserRow } from "./types";
import { normalizeEmail, validateEmail } from "./validators";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const appleAuthorizeUrl = "https://appleid.apple.com/auth/authorize";
const appleTokenUrl = "https://appleid.apple.com/auth/token";
const appleKeysUrl = "https://appleid.apple.com/auth/keys";
const appleIssuer = "https://appleid.apple.com";
const appleProvider = "apple";

interface AppleState {
  returnTo: string;
  nonce: string;
  exp: number;
}

interface AppleTokenResponse {
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface AppleIdTokenPayload {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
}

interface AppleUserPayload {
  email?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

type AppleJwk = JsonWebKey & { kid?: string };

export function hasAppleSsoConfig(env: Env): boolean {
  return Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY);
}

export async function buildAppleAuthorizeRedirect(input: {
  env: Env;
  request: Request;
  returnTo?: string | null;
}): Promise<Response> {
  if (!hasAppleSsoConfig(input.env)) {
    return redirectToLogin(input.request, "apple_not_configured");
  }

  const requestUrl = new URL(input.request.url);
  const redirectUri = getAppleRedirectUri(input.env, requestUrl);
  const state = await signAppleState(input.env, {
    returnTo: sanitizeReturnTo(input.returnTo),
    nonce: randomId("apple_nonce"),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
  });

  const destination = new URL(appleAuthorizeUrl);
  destination.searchParams.set("client_id", input.env.APPLE_CLIENT_ID!);
  destination.searchParams.set("redirect_uri", redirectUri);
  destination.searchParams.set("response_type", "code");
  destination.searchParams.set("response_mode", "form_post");
  destination.searchParams.set("scope", "name email");
  destination.searchParams.set("state", state);

  return Response.redirect(destination.toString(), 302);
}

export async function completeAppleCallback(input: {
  env: Env;
  request: Request;
  code: string;
  state: string;
  userPayload?: string | null;
}): Promise<Response> {
  if (!hasAppleSsoConfig(input.env)) {
    return redirectToLogin(input.request, "apple_not_configured");
  }
  if (!input.code || !input.state) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Apple sign-in callback is incomplete.", 401);
  }

  const state = await verifyAppleState(input.env, input.state);
  const requestUrl = new URL(input.request.url);
  const token = await exchangeAppleCode(input.env, input.code, getAppleRedirectUri(input.env, requestUrl));
  const idToken = await verifyAppleIdToken(input.env, token.id_token || "");
  const userInfo = parseAppleUserPayload(input.userPayload);
  const user = await upsertAppleUser(input.env, {
    subject: idToken.sub!,
    email: normalizeEmail(idToken.email || userInfo.email || ""),
    name: userInfo.name,
    emailVerified: idToken.email_verified,
  });

  return await completeSsoLogin({ env: input.env, request: input.request, user, returnTo: state.returnTo });
}

export async function readAppleCallbackPayload(request: Request): Promise<{
  code: string;
  state: string;
  userPayload?: string | null;
  error?: string | null;
}> {
  if (request.method === "POST") {
    const form = await request.formData();
    return {
      code: String(form.get("code") || ""),
      state: String(form.get("state") || ""),
      userPayload: typeof form.get("user") === "string" ? String(form.get("user")) : null,
      error: typeof form.get("error") === "string" ? String(form.get("error")) : null,
    };
  }

  const url = new URL(request.url);
  return {
    code: url.searchParams.get("code") || "",
    state: url.searchParams.get("state") || "",
    userPayload: url.searchParams.get("user"),
    error: url.searchParams.get("error"),
  };
}

export function redirectToLogin(request: Request, reason: string): Response {
  const url = new URL(request.url);
  url.pathname = "/login";
  url.search = `?sso=${encodeURIComponent(reason)}`;
  return Response.redirect(url.toString(), 302);
}

async function exchangeAppleCode(env: Env, code: string, redirectUri: string): Promise<AppleTokenResponse> {
  const clientSecret = await createAppleClientSecret(env);
  const body = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID!,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(appleTokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = (await response.json()) as AppleTokenResponse;
  if (!response.ok || token.error || !token.id_token) {
    throw new ApiError("INVALID_SSO_ASSERTION", token.error_description || token.error || "Apple token exchange failed.", 401);
  }
  return token;
}

async function upsertAppleUser(
  env: Env,
  input: { subject: string; email: string; name: string | null; emailVerified: boolean | string | undefined },
): Promise<UserRow> {
  const now = new Date().toISOString();
  const existingIdentity = await env.DB.prepare(
    `SELECT user_id, provider_email FROM external_identities
     WHERE provider = ? AND provider_user_id = ?
     LIMIT 1`,
  )
    .bind(appleProvider, input.subject)
    .first<{ user_id: string; provider_email: string }>();

  let user = existingIdentity?.user_id ? await getUserById(env.DB, existingIdentity.user_id) : null;
  const email = input.email || existingIdentity?.provider_email || "";

  if (!user && validateEmail(email)) {
    user = await getUserByEmail(env.DB, email);
  }
  if (!user && !validateEmail(email)) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Apple did not provide an email for this new account.", 401);
  }

  if (!user) {
    const id = randomId("user");
    const name = input.name || email.split("@")[0] || "Apple User";
    await env.DB.prepare(
      `INSERT INTO users (
        id, email, password_hash, name, avatar_url, institution, field_of_interest,
        bio, website, role, system_role, source, global_status, status, created_at, updated_at, last_login_at
      ) VALUES (?, ?, 'apple_sso_only', ?, NULL, NULL, NULL, NULL, NULL, 'free', 'user', 'apple', 'active', 'active', ?, ?, NULL)`,
    )
      .bind(id, email, name, now, now)
      .run();
    await insertDefaultServices(env.DB, id, now);
    user = await getUserById(env.DB, id);
  } else if (input.name) {
    await env.DB.prepare(
      `UPDATE users
       SET name = CASE WHEN name = email OR name = '' THEN ? ELSE name END,
        updated_at = ?
       WHERE id = ?`,
    )
      .bind(input.name, now, user.id)
      .run();
    user = await getUserById(env.DB, user.id);
  }

  if (!user) throw new ApiError("INTERNAL_ERROR", "Apple user could not be loaded.", 500);

  await env.DB.prepare(
    `INSERT OR IGNORE INTO external_identities (
      id, user_id, provider, provider_user_id, provider_email, credential_hash,
      credential_salt, credential_algorithm, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
  )
    .bind(
      randomId("ext"),
      user.id,
      appleProvider,
      input.subject,
      email || user.email,
      JSON.stringify({ emailVerified: input.emailVerified ?? null }),
      now,
      now,
    )
    .run();

  await env.DB.prepare(
    `UPDATE external_identities
     SET user_id = ?,
      provider_email = ?,
      metadata = ?,
      updated_at = ?
     WHERE provider = ? AND provider_user_id = ?`,
  )
    .bind(
      user.id,
      email || user.email,
      JSON.stringify({ emailVerified: input.emailVerified ?? null }),
      now,
      appleProvider,
      input.subject,
    )
    .run();

  return user;
}

async function verifyAppleIdToken(env: Env, idToken: string): Promise<AppleIdTokenPayload> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new ApiError("INVALID_SSO_ASSERTION", "Apple id_token is invalid.", 401);

  const header = JSON.parse(decoder.decode(base64UrlDecode(parts[0]))) as { kid?: string; alg?: string };
  const payload = JSON.parse(decoder.decode(base64UrlDecode(parts[1]))) as AppleIdTokenPayload;
  if (header.alg !== "RS256" || !header.kid) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Apple id_token algorithm is invalid.", 401);
  }

  const keysResponse = await fetch(appleKeysUrl);
  const keysBody = (await keysResponse.json()) as { keys?: AppleJwk[] };
  const key = keysBody.keys?.find((item) => item.kid === header.kid);
  if (!key) throw new ApiError("INVALID_SSO_ASSERTION", "Apple signing key was not found.", 401);

  const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
    "verify",
  ]);
  const verified = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    cryptoKey,
    asArrayBuffer(base64UrlDecode(parts[2])),
    encoder.encode(`${parts[0]}.${parts[1]}`),
  );
  if (!verified) throw new ApiError("INVALID_SSO_ASSERTION", "Apple id_token signature is invalid.", 401);

  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.iss !== appleIssuer || !audience.includes(env.APPLE_CLIENT_ID) || !payload.sub || !payload.exp || payload.exp <= now) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Apple id_token claims are invalid.", 401);
  }

  return payload;
}

async function createAppleClientSecret(env: Env): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 15777000;
  const header = base64UrlEncodeJson({ alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" });
  const payload = base64UrlEncodeJson({
    iss: env.APPLE_TEAM_ID,
    iat: issuedAt,
    exp: expiresAt,
    aud: appleIssuer,
    sub: env.APPLE_CLIENT_ID,
  });
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.APPLE_PRIVATE_KEY!),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput));
  return `${signingInput}.${base64UrlEncode(normalizeEcdsaSignature(new Uint8Array(signature)))}`;
}

async function signAppleState(env: Env, state: AppleState): Promise<string> {
  const payload = base64UrlEncodeJson(state);
  const signature = await hmacBase64Url(payload, getJwtSecret(env));
  return `${payload}.${signature}`;
}

async function verifyAppleState(env: Env, state: string): Promise<AppleState> {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new ApiError("INVALID_SSO_ASSERTION", "Apple state is invalid.", 401);
  const expected = await hmacBase64Url(payload, getJwtSecret(env));
  if (!constantTimeStringEqual(signature, expected)) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Apple state signature is invalid.", 401);
  }
  const parsed = JSON.parse(decoder.decode(base64UrlDecode(payload))) as AppleState;
  if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Apple sign-in state expired.", 401);
  }
  return { ...parsed, returnTo: sanitizeReturnTo(parsed.returnTo) };
}

async function hmacBase64Url(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

function parseAppleUserPayload(value?: string | null): { email: string; name: string | null } {
  if (!value) return { email: "", name: null };
  try {
    const parsed = JSON.parse(value) as AppleUserPayload;
    const first = parsed.name?.firstName?.trim() || "";
    const last = parsed.name?.lastName?.trim() || "";
    return {
      email: normalizeEmail(parsed.email || ""),
      name: [first, last].filter(Boolean).join(" ") || null,
    };
  } catch {
    return { email: "", name: null };
  }
}

function getAppleRedirectUri(env: Env, requestUrl: URL): string {
  return env.APPLE_REDIRECT_URI || new URL("/api/auth/sso/apple/callback", requestUrl.origin).toString();
}

function sanitizeReturnTo(value?: string | null): string {
  if (!value || typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncode(encoder.encode(JSON.stringify(value)));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const bytes = base64ToBytes(normalized);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function normalizeEcdsaSignature(signature: Uint8Array): Uint8Array {
  if (signature.byteLength === 64) return signature;
  return derToJose(signature, 32);
}

function derToJose(signature: Uint8Array, size: number): Uint8Array {
  if (signature[0] !== 0x30) throw new Error("Invalid DER ECDSA signature.");
  let offset = 2;
  if (signature[1] & 0x80) offset = 2 + (signature[1] & 0x7f);
  if (signature[offset] !== 0x02) throw new Error("Invalid DER ECDSA signature.");
  const rLength = signature[offset + 1];
  const r = signature.slice(offset + 2, offset + 2 + rLength);
  offset = offset + 2 + rLength;
  if (signature[offset] !== 0x02) throw new Error("Invalid DER ECDSA signature.");
  const sLength = signature[offset + 1];
  const s = signature.slice(offset + 2, offset + 2 + sLength);
  const result = new Uint8Array(size * 2);
  result.set(trimAndPad(r, size), 0);
  result.set(trimAndPad(s, size), size);
  return result;
}

function trimAndPad(value: Uint8Array, size: number): Uint8Array {
  let start = 0;
  while (start < value.byteLength - 1 && value[start] === 0) start += 1;
  const trimmed = value.slice(start);
  const result = new Uint8Array(size);
  result.set(trimmed.slice(-size), Math.max(0, size - trimmed.byteLength));
  return result;
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}
