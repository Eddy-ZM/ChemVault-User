import { clearSessionCookie, getAuthContext, revokeSession } from "../../../_shared/auth";
import { sanitizeReturnTo } from "../../../_shared/returnTo";
import type { Env } from "../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const context = await getAuthContext(env, request);
    if (context) await revokeSession(env, context.sessionId);
  } catch {
    // Clearing the browser cookie must still succeed if session cleanup is unavailable.
  }

  const requestUrl = new URL(request.url);
  const returnTo = sanitizeReturnTo(requestUrl.searchParams.get("returnTo"), "/login");
  return new Response(null, {
    status: 303,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Location: returnTo,
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
      "Set-Cookie": clearSessionCookie(env, request),
      "X-Content-Type-Options": "nosniff",
    },
  });
};
