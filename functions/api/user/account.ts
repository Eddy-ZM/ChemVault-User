import { clearSessionCookie, requireUser, revokeAllUserSessions } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const now = new Date().toISOString();

    await env.DB.prepare(`UPDATE users SET status = 'deleted', updated_at = ? WHERE id = ?`).bind(now, user.id).run();
    await revokeAllUserSessions(env, user);

    return jsonResponse(request, { ok: true }, { headers: { "Set-Cookie": clearSessionCookie(env, request) } });
  });
