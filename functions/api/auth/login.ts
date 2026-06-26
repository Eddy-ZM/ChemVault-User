import { createSession, sessionCookie } from "../../_shared/auth";
import { getUserByEmail, toPublicUser } from "../../_shared/db";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import type { Env } from "../../_shared/types";
import { verifyPassword } from "../../_shared/security";
import { validateLoginPayload } from "../../_shared/validators";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const payload = validateLoginPayload(await readJson(request));
    const user = await getUserByEmail(env.DB, payload.email);

    if (!user) throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    if (user.status === "disabled") throw new ApiError("USER_DISABLED", "This account has been disabled.", 403);
    if (user.status === "deleted") throw new ApiError("USER_DELETED", "This account has been deleted.", 403);
    if (user.global_status === "disabled") throw new ApiError("USER_DISABLED", "This account has been disabled.", 403);
    if (user.global_status === "deleted") throw new ApiError("USER_DELETED", "This account has been deleted.", 403);

    const ok = await verifyPassword(payload.password, user.password_hash);
    if (!ok) throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);

    const now = new Date().toISOString();
    await env.DB.prepare(`UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`)
      .bind(now, now, user.id)
      .run();
    user.last_login_at = now;
    user.updated_at = now;

    const session = await createSession({ env, request, userId: user.id });
    return jsonResponse(request, { user: toPublicUser(user) }, {
      headers: { "Set-Cookie": sessionCookie(env, request, session.token, session.expiresAt) },
    });
  });
