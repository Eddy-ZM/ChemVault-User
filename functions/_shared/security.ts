const encoder = new TextEncoder();
const decoder = new TextDecoder();
const hashAlgorithm = "SHA-256";
const pbkdf2Iterations = 100_000;

export interface SessionJwtPayload {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
}

export function randomId(prefix = ""): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = toBase64Url(bytes);
  return prefix ? `${prefix}_${id}` : id;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(hashAlgorithm, encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const [aHash, bHash] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  return constantTimeEqual(encoder.encode(aHash), encoder.encode(bHash));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: asArrayBuffer(salt),
      iterations: pbkdf2Iterations,
      hash: hashAlgorithm,
    },
    key,
    256,
  );

  return `pbkdf2$sha256$${pbkdf2Iterations}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(derived))}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, algorithm, iterationsText, saltText, expectedText] = storedHash.split("$");
  if (scheme !== "pbkdf2" || algorithm !== "sha256" || !iterationsText || !saltText || !expectedText) return false;

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 100_000) return false;

  const salt = fromBase64Url(saltText);
  const expected = fromBase64Url(expectedText);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: asArrayBuffer(salt),
      iterations,
      hash: hashAlgorithm,
    },
    key,
    expected.byteLength * 8,
  );

  return constantTimeEqual(new Uint8Array(derived), expected);
}

export async function createSessionJwt(input: {
  secret: string;
  sessionId: string;
  userId: string;
  expiresAt: string;
}): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: SessionJwtPayload = {
    sub: input.userId,
    sid: input.sessionId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(new Date(input.expiresAt).getTime() / 1000),
  };
  const unsigned = `${encodeJson(header)}.${encodeJson(payload)}`;
  const signature = await hmacSign(unsigned, input.secret);
  return `${unsigned}.${signature}`;
}

export async function verifySessionJwt(token: string, secret: string): Promise<SessionJwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerText, payloadText, signatureText] = parts;
  const unsigned = `${headerText}.${payloadText}`;
  const expectedSignature = await hmacSign(unsigned, secret);
  if (!constantTimeEqual(fromBase64Url(signatureText), fromBase64Url(expectedSignature))) return null;

  try {
    const header = JSON.parse(decoder.decode(fromBase64Url(headerText))) as { alg?: string; typ?: string };
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;

    const payload = JSON.parse(decoder.decode(fromBase64Url(payloadText))) as SessionJwtPayload;
    if (!payload.sub || !payload.sid || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

function encodeJson(value: unknown): string {
  return toBase64Url(encoder.encode(JSON.stringify(value)));
}

async function hmacSign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: hashAlgorithm }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let index = 0; index < a.byteLength; index += 1) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
