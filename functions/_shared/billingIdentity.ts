import { getUserByEmail } from "./db";
import { ApiError } from "./responses";
import type { Env } from "./types";
import { normalizeEmail, validateEmail } from "./validators";

export interface BillingIdentity {
  id: string;
  email: string;
}

export function requireBillingServiceSecret(env: Env, request: Request): void {
  const secret = env.BILLING_SERVICE_SECRET?.trim();
  const authorization = request.headers.get("authorization") || "";
  if (!secret || authorization !== `Bearer ${secret}`) {
    throw new ApiError("UNAUTHORIZED", "Invalid billing service credential.", 401);
  }
}

export async function resolveBillingIdentity(env: Env, rawEmail: string | null): Promise<BillingIdentity> {
  const email = normalizeEmail(rawEmail || "");
  if (!validateEmail(email)) {
    throw new ApiError("VALIDATION_ERROR", "A valid email address is required.", 400);
  }

  const user = await getUserByEmail(env.DB, email);
  if (!user || user.status !== "active" || user.global_status !== "active") {
    throw new ApiError("INVALID_CREDENTIALS", "Billing identity was not found.", 404);
  }

  return { id: user.id, email: normalizeEmail(user.email) };
}
