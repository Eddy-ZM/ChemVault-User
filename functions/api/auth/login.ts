import { createSession, sessionCookie } from "../../_shared/auth";
import { getUserByEmail, toPublicUser } from "../../_shared/db";
import { verifyMailSystemPassword } from "../../_shared/externalAuth";
import { syncMailUser } from "../../_shared/mailUserSync";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import type { Env, UserRow } from "../../_shared/types";
import { validateLoginPayload } from "../../_shared/validators";
import { verifyAccountPassword } from "../../_shared/passwordAuth";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const payload = validateLoginPayload(await readJson(request));
    let user = await getUserByEmail(env.DB, payload.email);

    assertUserCanLogin(user);

    let ok = user ? await verifyAccountPassword(env, user, payload.password) : false;
    if (!ok) {
      const mailAuth = await verifyMailSystemPassword(env, payload.email, payload.password);
      if (mailAuth) {
        await syncMailUser(env, request, {
          primaryEmail: mailAuth.email,
          name: mailAuth.name,
          mailAddress: mailAuth.mailAddress,
          displayName: mailAuth.name,
          mailRole: mailAuth.mailRole,
          mailStatus: mailAuth.mailStatus,
          canSend: mailAuth.canSend,
          canReceive: mailAuth.canReceive,
          canLoginMail: mailAuth.canLoginMail,
          mailboxQuotaMb: mailAuth.mailboxQuotaMb,
          aliases: mailAuth.aliases,
          sourceUserId: mailAuth.mailUserId,
        });
        user = await getUserByEmail(env.DB, mailAuth.email);
        assertUserCanLogin(user);
        ok = true;
      }
    }
    if (!ok) throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    if (!user) throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);

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

function assertUserCanLogin(user: UserRow | null): void {
  if (!user) return;
  if (user.status === "disabled") throw new ApiError("USER_DISABLED", "This account has been disabled.", 403);
  if (user.status === "deleted") throw new ApiError("USER_DELETED", "This account has been deleted.", 403);
  if (user.global_status === "disabled") throw new ApiError("USER_DISABLED", "This account has been disabled.", 403);
  if (user.global_status === "deleted") throw new ApiError("USER_DELETED", "This account has been deleted.", 403);
}
