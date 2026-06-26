import { ApiError, handleApi, jsonResponse } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const startUrl = env.MAIL_SYSTEM_SSO_URL;
    if (!startUrl) {
      const url = new URL(request.url);
      url.pathname = "/login";
      url.search = "?sso=mail_not_configured";
      return Response.redirect(url.toString(), 302);
    }

    const requestUrl = new URL(request.url);
    const redirectUri = new URL("/api/auth/sso/mail/callback", requestUrl.origin);
    const destination = new URL(startUrl);
    destination.searchParams.set("client_id", "chemvault_user");
    destination.searchParams.set("redirect_uri", redirectUri.toString());
    destination.searchParams.set("return_to", sanitizeReturnTo(requestUrl.searchParams.get("returnTo")));

    return Response.redirect(destination.toString(), 302);
  });

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    if (!env.MAIL_SYSTEM_SSO_URL) {
      throw new ApiError("SSO_NOT_CONFIGURED", "Mail SSO URL is not configured.", 501);
    }
    return jsonResponse(request, { url: env.MAIL_SYSTEM_SSO_URL });
  });

function sanitizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
