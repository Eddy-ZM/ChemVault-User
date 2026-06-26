import { clearSessionCookie, getAuthContext, revokeSession } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const context = await getAuthContext(env, request);
    if (context) await revokeSession(env, context.sessionId);

    return jsonResponse(request, { ok: true }, { headers: { "Set-Cookie": clearSessionCookie(env, request) } });
  });
