import { ApiError } from "./responses";
import type { Env, UserRow } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const handoffLifetimeSeconds = 5 * 60;

export interface UserSystemHandoffPayload {
  sub: string;
  aud: string;
  typ: "chemvault-user-handoff";
  iat: number;
  exp: number;
}

export async function createUserSystemHandoffToken(env: Env, user: UserRow, audience = "chemvault-lab") {
  const now = Math.floor(Date.now() / 1000);
  const payload: UserSystemHandoffPayload = {
    sub: user.id,
    aud: audience,
    typ: "chemvault-user-handoff",
    iat: now,
    exp: now + handoffLifetimeSeconds,
  };
  const header = { alg: "HS256", typ: "JWT" };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = await sign(unsigned, getHandoffSecret(env));
  return `${unsigned}.${signature}`;
}

export async function verifyUserSystemHandoffToken(env: Env, token: string, expectedAudience = "chemvault-lab") {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Invalid User System handoff token.", 401);
  }

  const [headerText, payloadText, signatureText] = parts;
  const unsigned = `${headerText}.${payloadText}`;
  const expected = await sign(unsigned, getHandoffSecret(env));
  if (!timingSafeEqual(signatureText, expected)) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Invalid User System handoff signature.", 401);
  }

  let payload: UserSystemHandoffPayload;
  try {
    const header = JSON.parse(decoder.decode(base64UrlDecode(headerText))) as { alg?: string; typ?: string };
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      throw new Error("Unsupported handoff header");
    }
    payload = JSON.parse(decoder.decode(base64UrlDecode(payloadText))) as UserSystemHandoffPayload;
  } catch {
    throw new ApiError("INVALID_SSO_ASSERTION", "Invalid User System handoff payload.", 401);
  }

  if (payload.typ !== "chemvault-user-handoff" || payload.aud !== expectedAudience || !payload.sub) {
    throw new ApiError("INVALID_SSO_ASSERTION", "Invalid User System handoff claims.", 401);
  }
  if (payload.exp * 1000 <= Date.now()) {
    throw new ApiError("INVALID_SSO_ASSERTION", "User System handoff token has expired.", 401);
  }
  return payload;
}

function getHandoffSecret(env: Env) {
  if (!env.JWT_SECRET) {
    throw new ApiError("INTERNAL_ERROR", "JWT_SECRET is not configured.", 500);
  }
  return env.JWT_SECRET;
}

function base64UrlJson(value: unknown) {
  return base64UrlEncode(encoder.encode(JSON.stringify(value)));
}

async function sign(input: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return base64UrlEncode(new Uint8Array(signature));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
