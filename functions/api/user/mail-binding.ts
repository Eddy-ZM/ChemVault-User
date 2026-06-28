import { requireUser } from "../../_shared/auth";
import { toPublicUser } from "../../_shared/db";
import { bindVerifiedMailAccount, verifyMailSystemPassword } from "../../_shared/externalAuth";
import { enrichPublicUser } from "../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import type { Env } from "../../_shared/types";
import { normalizeEmail, validateEmail } from "../../_shared/validators";

const mailDomain = "chemvault.science";

function normalizeMailAddress(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  const email = normalizeEmail(raw.includes("@") ? raw : `${raw}@${mailDomain}`);
  if (!validateEmail(email) || !email.endsWith(`@${mailDomain}`)) {
    throw new ApiError("VALIDATION_ERROR", `Enter a valid @${mailDomain} mailbox.`, 400);
  }
  return email;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const payload = (await readJson(request)) as { mailAddress?: unknown; password?: unknown };
    const mailAddress = normalizeMailAddress(payload.mailAddress);
    const password = typeof payload.password === "string" ? payload.password : "";
    if (!password) throw new ApiError("VALIDATION_ERROR", "ChemVault Mail password is required.", 400);

    if (!env.MAIL_SYSTEM_SSO_SECRET && !env.MAIL_SYSTEM_SYNC_SECRET) {
      throw new ApiError("SSO_NOT_CONFIGURED", "ChemVault Mail binding is not configured.", 501);
    }

    const mail = await verifyMailSystemPassword(env, mailAddress, password);
    if (!mail) throw new ApiError("UNAUTHORIZED", "ChemVault Mail address or password is incorrect.", 401);

    const mailAccount = await bindVerifiedMailAccount({ env, request, user, mail });
    return jsonResponse(request, {
      ok: true,
      mailAccount,
      user: { ...toPublicUser(user), ...(await enrichPublicUser(env.DB, user)) },
    });
  });
