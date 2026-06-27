import { requireUser } from "../../_shared/auth";
import { verifyAccountPassword } from "../../_shared/passwordAuth";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import { hashPassword } from "../../_shared/security";
import type { Env } from "../../_shared/types";
import { validatePasswordStrength } from "../../_shared/validators";

export const onRequestPatch: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const payload = (await readJson(request)) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof payload.currentPassword === "string" ? payload.currentPassword : "";
    const newPassword = typeof payload.newPassword === "string" ? payload.newPassword : "";
    const strength = validatePasswordStrength(newPassword);

    if (!currentPassword || !strength.ok) {
      throw new ApiError("VALIDATION_ERROR", !strength.ok ? strength.message : "Current password is required.", 400);
    }

    const currentOk = await verifyAccountPassword(env, user, currentPassword);
    if (!currentOk) throw new ApiError("INVALID_CREDENTIALS", "Current password is incorrect.", 401);

    const now = new Date().toISOString();
    await env.DB.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`)
      .bind(await hashPassword(newPassword), now, user.id)
      .run();

    return jsonResponse(request, { ok: true });
  });
