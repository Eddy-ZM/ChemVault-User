import { ApiError, handleApi, jsonResponse, readJson } from "../../../../_shared/responses";
import { sanitizeReturnTo } from "../../../../_shared/returnTo";
import { mailSsoTurnstileAction, verifyTurnstileToken } from "../../../../_shared/turnstile";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const requestUrl = new URL(request.url);
    if (!env.MAIL_SYSTEM_SSO_URL) {
      const url = new URL(request.url);
      url.pathname = "/login";
      url.search = "?sso=mail_not_configured";
      return Response.redirect(url.toString(), 302);
    }

    await verifyTurnstileToken({
      env,
      request,
      token: requestUrl.searchParams.get("turnstileToken"),
      action: mailSsoTurnstileAction,
      missingTokenMessage: "Complete the Cloudflare verification before continuing with ChemVault Mail.",
    });

    return Response.redirect(buildMailSsoDestination(env, request, requestUrl.searchParams.get("returnTo")).toString(), 302);
  });

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    if (!env.MAIL_SYSTEM_SSO_URL) {
      throw new ApiError("SSO_NOT_CONFIGURED", "Mail SSO URL is not configured.", 501);
    }

    const payload = await readJson<{ turnstileToken?: unknown; returnTo?: unknown }>(request);
    await verifyTurnstileToken({
      env,
      request,
      token: typeof payload.turnstileToken === "string" ? payload.turnstileToken : null,
      action: mailSsoTurnstileAction,
      missingTokenMessage: "Complete the Cloudflare verification before continuing with ChemVault Mail.",
    });

    const returnTo = typeof payload.returnTo === "string" ? payload.returnTo : null;
    return jsonResponse(request, { url: buildMailSsoDestination(env, request, returnTo).toString() });
  });

export function buildMailSsoDestination(env: Env, request: Request, returnTo: string | null): URL {
  const requestUrl = new URL(request.url);
  const redirectUri = new URL("/api/auth/sso/mail/callback", requestUrl.origin);
  const destination = new URL(env.MAIL_SYSTEM_SSO_URL || "");
  destination.searchParams.set("sso", "chemvault-user");
  destination.searchParams.set("client_id", "chemvault_user");
  destination.searchParams.set("redirect_uri", redirectUri.toString());
  destination.searchParams.set("return_to", sanitizeReturnTo(returnTo));
  return destination;
}
