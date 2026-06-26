import { ApiError } from "./responses";
import type { Env } from "./types";

const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const registerTurnstileAction = "register_email";
export const mailSsoTurnstileAction = "mail_sso";

interface TurnstileSiteverifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
}

export function isTurnstileRequired(env: Env): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY) || env.NODE_ENV === "production";
}

export async function verifyTurnstileToken({
  env,
  request,
  token,
  action = registerTurnstileAction,
  missingTokenMessage = "Complete the Cloudflare verification before creating an account.",
}: {
  env: Env;
  request: Request;
  token?: string | null;
  action?: string;
  missingTokenMessage?: string;
}): Promise<void> {
  if (!isTurnstileRequired(env)) return;

  if (!env.TURNSTILE_SECRET_KEY) {
    throw new ApiError("VALIDATION_ERROR", "Human verification is not configured. Please try again later.", 503);
  }

  if (!token) {
    throw new ApiError("VALIDATION_ERROR", missingTokenMessage, 400);
  }

  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  body.set("idempotency_key", crypto.randomUUID());

  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) body.set("remoteip", remoteIp);

  let result: TurnstileSiteverifyResponse;
  try {
    const response = await fetch(siteverifyUrl, { method: "POST", body });
    result = (await response.json()) as TurnstileSiteverifyResponse;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Human verification could not be completed. Please try again.", 400);
  }

  if (!result.success) {
    throw new ApiError("VALIDATION_ERROR", "Human verification failed. Please try again.", 400);
  }

  if (result.action && result.action !== action) {
    throw new ApiError("VALIDATION_ERROR", "Human verification action did not match this request.", 400);
  }

  const expectedHostname = env.TURNSTILE_EXPECTED_HOSTNAME?.trim();
  if (expectedHostname && result.hostname && result.hostname !== expectedHostname) {
    throw new ApiError("VALIDATION_ERROR", "Human verification hostname did not match this site.", 400);
  }
}
