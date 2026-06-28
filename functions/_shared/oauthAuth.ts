import { completeSsoLogin } from "./externalAuth";
import { getJwtSecret } from "./auth";
import { getUserByEmail, getUserById, insertDefaultServices } from "./db";
import { ApiError } from "./responses";
import { randomId } from "./security";
import type { Env, UserRow } from "./types";
import { normalizeEmail, validateEmail } from "./validators";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type OAuthProvider = "google" | "microsoft" | "github";
type OAuthMode = "login" | "link";

interface OAuthState {
  provider: OAuthProvider;
  returnTo: string;
  nonce: string;
  exp: number;
  mode: OAuthMode;
  userId?: string;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface ProviderProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  metadata: Record<string, unknown>;
}

type Jwk = JsonWebKey & { kid?: string; alg?: string };

const providerConfig = {
  google: {
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    scopes: "openid email profile",
  },
  microsoft: {
    label: "Microsoft",
    scopes: "openid email profile User.Read",
  },
  github: {
    label: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: "read:user user:email",
  },
} as const;

export function isOAuthProvider(value: string | undefined): value is OAuthProvider {
  return value === "google" || value === "microsoft" || value === "github";
}

export function hasOAuthProviderConfig(env: Env, provider: OAuthProvider): boolean {
  if (provider === "google") return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  if (provider === "microsoft") return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

export async function buildOAuthAuthorizeRedirect(input: {
  env: Env;
  request: Request;
  provider: OAuthProvider;
  returnTo?: string | null;
  mode?: OAuthMode;
  userId?: string;
}): Promise<Response> {
  if (!hasOAuthProviderConfig(input.env, input.provider)) {
    return redirectToLogin(input.request, `${input.provider}_not_configured`);
  }

  const mode = input.mode || "login";
  const nonce = randomId("oauth_nonce");
  const state = await signOAuthState(input.env, {
    provider: input.provider,
    returnTo: sanitizeReturnTo(input.returnTo),
    nonce,
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    mode,
    userId: mode === "link" ? input.userId : undefined,
  });

  const destination = buildOAuthAuthorizationUrl({
    env: input.env,
    request: input.request,
    provider: input.provider,
    state,
    nonce,
  });

  return Response.redirect(destination.toString(), 302);
}

export function buildOAuthAuthorizationUrl(input: {
  env: Env;
  request: Request;
  provider: OAuthProvider;
  state: string;
  nonce: string;
}): URL {
  if (input.provider === "microsoft") {
    const tenant = input.env.MICROSOFT_TENANT_ID || "common";
    const url = new URL(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`);
    url.searchParams.set("client_id", input.env.MICROSOFT_CLIENT_ID || "");
    url.searchParams.set("redirect_uri", getOAuthRedirectUri(input.env, input.request, input.provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", providerConfig.microsoft.scopes);
    url.searchParams.set("state", input.state);
    url.searchParams.set("nonce", input.nonce);
    return url;
  }

  const config = providerConfig[input.provider];
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", getOAuthClientId(input.env, input.provider));
  url.searchParams.set("redirect_uri", getOAuthRedirectUri(input.env, input.request, input.provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("state", input.state);
  if (input.provider === "google") {
    url.searchParams.set("nonce", input.nonce);
    url.searchParams.set("prompt", "select_account");
  }
  return url;
}

export async function completeOAuthCallback(input: {
  env: Env;
  request: Request;
  provider: OAuthProvider;
  code: string;
  state: string;
}): Promise<Response> {
  if (!hasOAuthProviderConfig(input.env, input.provider)) {
    return redirectToLogin(input.request, `${input.provider}_not_configured`);
  }
  if (!input.code || !input.state) {
    throw new ApiError("INVALID_SSO_ASSERTION", "OAuth callback is incomplete.", 401);
  }

  const state = await verifyOAuthState(input.env, input.state);
  if (state.provider !== input.provider) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Invalid OAuth state.", 401);
  }

  const token = await exchangeOAuthCode(input.env, input.request, input.provider, input.code);
  const profile = await loadProviderProfile(input.env, input.provider, token, state.nonce);

  if (!profile.email) throw new ApiError("INVALID_SSO_ASSERTION", `${providerConfig[input.provider].label} did not provide an email.`, 401);
  if (!profile.emailVerified) {
    throw new ApiError("INVALID_SSO_ASSERTION", `${providerConfig[input.provider].label} email is not verified.`, 401);
  }

  if (state.mode === "link") {
    const userId = state.userId || "";
    const user = userId ? await getUserById(input.env.DB, userId) : null;
    if (!user) throw new ApiError("UNAUTHORIZED", "OAuth link session is no longer valid.", 401);
    await linkOAuthIdentityToUser(input.env, user.id, profile);
    return await completeSsoLogin({ env: input.env, request: input.request, user, returnTo: state.returnTo });
  }

  const user = await upsertOAuthUser(input.env, profile);
  return await completeSsoLogin({
    env: input.env,
    request: input.request,
    user,
    returnTo: mailOnboardingReturnTo(state.returnTo, profile.provider),
  });
}

export function oauthFailureReason(provider: OAuthProvider, error: unknown): string {
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase();
    if (error.code === "SSO_NOT_CONFIGURED" || message.includes("not configured")) return `${provider}_not_configured`;
    if (message.includes("state")) return `${provider}_invalid_state`;
    if (message.includes("email") && message.includes("verified")) return `${provider}_email_not_verified`;
    if (message.includes("email")) return `${provider}_missing_email`;
    if (message.includes("already linked")) return `${provider}_account_linked`;
  }
  return `${provider}_failed`;
}

export function redirectToLogin(request: Request, reason: string): Response {
  const url = new URL(request.url);
  url.pathname = "/login";
  url.search = `?sso=${encodeURIComponent(reason)}`;
  return Response.redirect(url.toString(), 302);
}

export async function signOAuthStateForTest(env: Env, state: Omit<OAuthState, "exp"> & { exp?: number }): Promise<string> {
  return await signOAuthState(env, {
    ...state,
    exp: state.exp || Math.floor(Date.now() / 1000) + 600,
  });
}

export async function verifyOAuthStateForTest(env: Env, state: string): Promise<OAuthState> {
  return await verifyOAuthState(env, state);
}

export function normalizeGoogleProfileForTest(payload: Record<string, unknown>): ProviderProfile {
  return normalizeGoogleProfile(payload);
}

export function normalizeMicrosoftProfileForTest(payload: Record<string, unknown>): ProviderProfile {
  return normalizeMicrosoftProfile(payload);
}

export async function upsertOAuthUserForTest(env: Env, profile: ProviderProfile): Promise<UserRow> {
  return await upsertOAuthUser(env, profile);
}

export async function linkOAuthIdentityToUserForTest(env: Env, userId: string, profile: ProviderProfile): Promise<void> {
  await linkOAuthIdentityToUser(env, userId, profile);
}

export function selectGitHubVerifiedEmail(
  profileEmail: string | null | undefined,
  emails: Array<{ email?: string | null; primary?: boolean; verified?: boolean }> | null | undefined,
): string {
  const normalizedProfileEmail = normalizeEmail(profileEmail || "");
  const verifiedEmails = (emails || []).filter((entry) => entry.email && entry.verified);
  const primary = verifiedEmails.find((entry) => entry.primary)?.email || "";
  const matchingPublic = verifiedEmails.find((entry) => normalizeEmail(entry.email || "") === normalizedProfileEmail)?.email || "";
  const selected = primary || matchingPublic || verifiedEmails[0]?.email || "";
  return normalizeEmail(selected || "");
}

async function exchangeOAuthCode(env: Env, request: Request, provider: OAuthProvider, code: string): Promise<TokenResponse> {
  if (provider === "github") {
    const body = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID!,
      client_secret: env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: getOAuthRedirectUri(env, request, provider),
    });
    const response = await fetch(providerConfig.github.tokenUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const token = (await response.json()) as TokenResponse;
    if (!response.ok || token.error || !token.access_token) {
      throw new ApiError("INVALID_SSO_ASSERTION", token.error_description || token.error || "GitHub OAuth callback failed.", 401);
    }
    return token;
  }

  const body = new URLSearchParams({
    client_id: getOAuthClientId(env, provider),
    client_secret: getOAuthClientSecret(env, provider),
    code,
    grant_type: "authorization_code",
    redirect_uri: getOAuthRedirectUri(env, request, provider),
  });
  const tokenUrl =
    provider === "google"
      ? providerConfig.google.tokenUrl
      : `https://login.microsoftonline.com/${encodeURIComponent(env.MICROSOFT_TENANT_ID || "common")}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = (await response.json()) as TokenResponse;
  if (!response.ok || token.error || !token.id_token) {
    throw new ApiError(
      "INVALID_SSO_ASSERTION",
      token.error_description || token.error || `${providerConfig[provider].label} token verification failed.`,
      401,
    );
  }
  return token;
}

async function loadProviderProfile(
  env: Env,
  provider: OAuthProvider,
  token: TokenResponse,
  nonce: string,
): Promise<ProviderProfile> {
  if (provider === "google") {
    const payload = await verifyOpenIdToken({
      idToken: token.id_token || "",
      clientId: env.GOOGLE_CLIENT_ID || "",
      jwksUrl: providerConfig.google.jwksUrl,
      issuer: "google",
      nonce,
    });
    return normalizeGoogleProfile(payload);
  }

  if (provider === "microsoft") {
    const tenant = env.MICROSOFT_TENANT_ID || "common";
    const payload = await verifyOpenIdToken({
      idToken: token.id_token || "",
      clientId: env.MICROSOFT_CLIENT_ID || "",
      jwksUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/discovery/v2.0/keys`,
      issuer: "microsoft",
      tenant,
      nonce,
    });
    return normalizeMicrosoftProfile(payload);
  }

  return await loadGitHubProfile(token.access_token || "");
}

function normalizeGoogleProfile(payload: Record<string, unknown>): ProviderProfile {
  const email = normalizeEmail(String(payload.email || ""));
  return {
    provider: "google",
    providerAccountId: String(payload.sub || ""),
    email,
    name: cleanName(payload.name, email, "Google User"),
    avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    metadata: {
      issuer: payload.iss || null,
      hostedDomain: payload.hd || null,
      picture: payload.picture || null,
    },
  };
}

function normalizeMicrosoftProfile(payload: Record<string, unknown>): ProviderProfile {
  const email = normalizeEmail(
    String(payload.email || payload.preferred_username || payload.upn || payload.unique_name || ""),
  );
  return {
    provider: "microsoft",
    providerAccountId: String(payload.oid || payload.sub || ""),
    email,
    name: cleanName(payload.name, email, "Microsoft User"),
    avatarUrl: null,
    emailVerified: Boolean(email),
    metadata: {
      tenantId: payload.tid || null,
      preferredUsername: payload.preferred_username || null,
    },
  };
}

async function loadGitHubProfile(accessToken: string): Promise<ProviderProfile> {
  if (!accessToken) throw new ApiError("INVALID_SSO_ASSERTION", "GitHub OAuth callback failed.", 401);
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${accessToken}`,
    "user-agent": "ChemVault-User-Center",
    "x-github-api-version": "2022-11-28",
  };
  const profileResponse = await fetch("https://api.github.com/user", { headers });
  if (!profileResponse.ok) throw new ApiError("INVALID_SSO_ASSERTION", "GitHub profile could not be loaded.", 401);
  const profile = (await profileResponse.json()) as {
    id?: number | string;
    email?: string | null;
    name?: string | null;
    login?: string | null;
    avatar_url?: string | null;
    html_url?: string | null;
  };

  const emailsResponse = await fetch("https://api.github.com/user/emails", { headers });
  const emails = emailsResponse.ok
    ? ((await emailsResponse.json()) as Array<{ email?: string; primary?: boolean; verified?: boolean; visibility?: string | null }>)
    : [];
  const email = selectGitHubVerifiedEmail(profile.email, emails);
  if (!email) throw new ApiError("INVALID_SSO_ASSERTION", "GitHub did not provide a verified email.", 401);

  return {
    provider: "github",
    providerAccountId: String(profile.id || ""),
    email,
    name: cleanName(profile.name || profile.login, email, "GitHub User"),
    avatarUrl: profile.avatar_url || null,
    emailVerified: true,
    metadata: {
      login: profile.login || null,
      htmlUrl: profile.html_url || null,
      publicEmail: profile.email || null,
    },
  };
}

async function upsertOAuthUser(env: Env, profile: ProviderProfile): Promise<UserRow> {
  assertValidProfile(profile);
  const now = new Date().toISOString();
  const existingIdentity = await getIdentityByProviderAccount(env.DB, profile.provider, profile.providerAccountId);
  let user = existingIdentity?.user_id ? await getUserById(env.DB, existingIdentity.user_id) : null;

  if (!user && validateEmail(profile.email)) {
    user = await getUserByEmail(env.DB, profile.email);
  }

  if (!user) {
    const id = randomId("user");
    await env.DB.prepare(
      `INSERT INTO users (
        id, email, password_hash, name, avatar_url, institution, field_of_interest,
        bio, website, role, system_role, source, global_status, status, created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 'free', 'user', ?, 'active', 'active', ?, ?, NULL)`,
    )
      .bind(id, profile.email, `${profile.provider}_oauth_only`, profile.name, profile.avatarUrl, profile.provider, now, now)
      .run();
    await insertDefaultServices(env.DB, id, now);
    user = await getUserById(env.DB, id);
  } else {
    await updateExistingUserFromProfile(env.DB, user, profile, now);
    user = await getUserById(env.DB, user.id);
  }

  if (!user) throw new ApiError("INTERNAL_ERROR", "OAuth user could not be loaded.", 500);
  await upsertOAuthIdentity(env, user.id, profile, now);
  return user;
}

async function linkOAuthIdentityToUser(env: Env, userId: string, profile: ProviderProfile): Promise<void> {
  assertValidProfile(profile);
  const existingByAccount = await getIdentityByProviderAccount(env.DB, profile.provider, profile.providerAccountId);
  if (existingByAccount?.user_id && existingByAccount.user_id !== userId) {
    throw new ApiError("VALIDATION_ERROR", `This ${providerConfig[profile.provider].label} account is already linked to another ChemVault account.`, 409);
  }

  const existingByEmail = await env.DB.prepare(
    `SELECT user_id FROM external_identities
     WHERE provider = ? AND provider_email = ?
     LIMIT 1`,
  )
    .bind(profile.provider, profile.email)
    .first<{ user_id: string }>();
  if (existingByEmail?.user_id && existingByEmail.user_id !== userId) {
    throw new ApiError("VALIDATION_ERROR", `This ${providerConfig[profile.provider].label} email is already linked to another ChemVault account.`, 409);
  }

  await upsertOAuthIdentity(env, userId, profile, new Date().toISOString());
}

async function updateExistingUserFromProfile(db: D1Database, user: UserRow, profile: ProviderProfile, now: string) {
  await db
    .prepare(
      `UPDATE users
       SET name = CASE WHEN name = email OR name = '' THEN ? ELSE name END,
        avatar_url = COALESCE(avatar_url, ?),
        updated_at = ?
       WHERE id = ?`,
    )
    .bind(profile.name, profile.avatarUrl, now, user.id)
    .run();
}

async function upsertOAuthIdentity(env: Env, userId: string, profile: ProviderProfile, now: string): Promise<void> {
  const metadata = JSON.stringify({
    ...profile.metadata,
    emailVerified: profile.emailVerified,
    avatarUrl: profile.avatarUrl,
    tokenStorage: "not_persisted",
  });

  await env.DB.prepare(
    `INSERT OR IGNORE INTO external_identities (
      id, user_id, provider, provider_user_id, provider_email, credential_hash,
      credential_salt, credential_algorithm, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
  )
    .bind(randomId("ext"), userId, profile.provider, profile.providerAccountId, profile.email, metadata, now, now)
    .run();

  await env.DB.prepare(
    `UPDATE external_identities
     SET user_id = ?,
      provider_email = ?,
      metadata = ?,
      updated_at = ?
     WHERE provider = ? AND provider_user_id = ?`,
  )
    .bind(userId, profile.email, metadata, now, profile.provider, profile.providerAccountId)
    .run();
}

async function getIdentityByProviderAccount(db: D1Database, provider: OAuthProvider, providerAccountId: string) {
  return await db
    .prepare(
      `SELECT user_id, provider_email FROM external_identities
       WHERE provider = ? AND provider_user_id = ?
       LIMIT 1`,
    )
    .bind(provider, providerAccountId)
    .first<{ user_id: string; provider_email: string }>();
}

function assertValidProfile(profile: ProviderProfile): void {
  if (!profile.providerAccountId) {
    throw new ApiError("INVALID_SSO_ASSERTION", `${providerConfig[profile.provider].label} account id is missing.`, 401);
  }
  if (!validateEmail(profile.email)) {
    throw new ApiError("INVALID_SSO_ASSERTION", `${providerConfig[profile.provider].label} did not provide a usable email.`, 401);
  }
}

async function verifyOpenIdToken(input: {
  idToken: string;
  clientId: string;
  jwksUrl: string;
  issuer: "google" | "microsoft";
  tenant?: string;
  nonce: string;
}): Promise<Record<string, unknown>> {
  const parts = input.idToken.split(".");
  if (parts.length !== 3) throw new ApiError("INVALID_SSO_ASSERTION", "Token verification failed.", 401);
  const header = JSON.parse(decoder.decode(base64UrlDecode(parts[0]))) as { kid?: string; alg?: string };
  const payload = JSON.parse(decoder.decode(base64UrlDecode(parts[1]))) as Record<string, unknown>;
  if (header.alg !== "RS256" || !header.kid) throw new ApiError("INVALID_SSO_ASSERTION", "Token verification failed.", 401);

  const keysResponse = await fetch(input.jwksUrl);
  const keysBody = (await keysResponse.json()) as { keys?: Jwk[] };
  const key = keysBody.keys?.find((item) => item.kid === header.kid);
  if (!key) throw new ApiError("INVALID_SSO_ASSERTION", "Token verification failed.", 401);

  const cryptoKey = await crypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
    "verify",
  ]);
  const verified = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    cryptoKey,
    asArrayBuffer(base64UrlDecode(parts[2])),
    encoder.encode(`${parts[0]}.${parts[1]}`),
  );
  if (!verified) throw new ApiError("INVALID_SSO_ASSERTION", "Token verification failed.", 401);

  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp);
  const nbf = payload.nbf === undefined ? null : Number(payload.nbf);
  const audience = Array.isArray(payload.aud) ? payload.aud.map(String) : [String(payload.aud || "")];
  if (!exp || exp <= now || (nbf && nbf > now + 60) || !audience.includes(input.clientId)) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Token verification failed.", 401);
  }
  if (typeof payload.nonce === "string" && payload.nonce !== input.nonce) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Token verification failed.", 401);
  }
  if (input.issuer === "google" && payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new ApiError("INVALID_SSO_ASSERTION", "Token verification failed.", 401);
  }
  if (input.issuer === "microsoft" && !isValidMicrosoftIssuer(String(payload.iss || ""), input.tenant || "common")) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Token verification failed.", 401);
  }

  return payload;
}

function isValidMicrosoftIssuer(issuer: string, tenant: string): boolean {
  if (!issuer.startsWith("https://login.microsoftonline.com/") || !issuer.endsWith("/v2.0")) return false;
  if (!tenant || ["common", "organizations", "consumers"].includes(tenant)) return true;
  return issuer === `https://login.microsoftonline.com/${tenant}/v2.0`;
}

async function signOAuthState(env: Env, state: OAuthState): Promise<string> {
  const payload = base64UrlEncodeJson(state);
  const signature = await hmacBase64Url(payload, getOAuthSecret(env));
  return `${payload}.${signature}`;
}

async function verifyOAuthState(env: Env, state: string): Promise<OAuthState> {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new ApiError("INVALID_SSO_ASSERTION", "Invalid OAuth state.", 401);
  const expected = await hmacBase64Url(payload, getOAuthSecret(env));
  if (!constantTimeStringEqual(signature, expected)) throw new ApiError("INVALID_SSO_ASSERTION", "Invalid OAuth state.", 401);
  const parsed = JSON.parse(decoder.decode(base64UrlDecode(payload))) as OAuthState;
  if (!isOAuthProvider(parsed.provider) || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Invalid OAuth state.", 401);
  }
  return {
    ...parsed,
    mode: parsed.mode === "link" ? "link" : "login",
    returnTo: sanitizeReturnTo(parsed.returnTo),
  };
}

function getOAuthClientId(env: Env, provider: OAuthProvider): string {
  if (provider === "google") return env.GOOGLE_CLIENT_ID || "";
  if (provider === "microsoft") return env.MICROSOFT_CLIENT_ID || "";
  return env.GITHUB_CLIENT_ID || "";
}

function getOAuthClientSecret(env: Env, provider: OAuthProvider): string {
  if (provider === "google") return env.GOOGLE_CLIENT_SECRET || "";
  if (provider === "microsoft") return env.MICROSOFT_CLIENT_SECRET || "";
  return env.GITHUB_CLIENT_SECRET || "";
}

function getOAuthRedirectUri(env: Env, request: Request, provider: OAuthProvider): string {
  const authUrl = env.AUTH_URL || new URL(request.url).origin;
  return new URL(`/api/auth/sso/${provider}/callback`, authUrl).toString();
}

function getOAuthSecret(env: Env): string {
  return env.AUTH_SECRET || getJwtSecret(env);
}

function sanitizeReturnTo(value?: string | null): string {
  if (!value || typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function mailOnboardingReturnTo(returnTo: string, provider: OAuthProvider): string {
  if (provider !== "google" && provider !== "github") return returnTo;
  const params = new URLSearchParams({ returnTo, provider });
  return `/onboarding/mail?${params.toString()}`;
}

function cleanName(value: unknown, email: string, fallback: string): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (name) return name.slice(0, 160);
  return (email.split("@")[0] || fallback).slice(0, 160);
}

async function hmacBase64Url(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
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

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}
