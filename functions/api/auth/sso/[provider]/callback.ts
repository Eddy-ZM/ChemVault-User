import { completeOAuthCallback, isOAuthProvider, oauthFailureReason, redirectToLogin } from "../../../../_shared/oauthAuth";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) => {
  const provider = String(params.provider || "");
  if (!isOAuthProvider(provider)) return redirectToLogin(request, "oauth_provider_unsupported");

  const url = new URL(request.url);
  if (url.searchParams.get("error")) return redirectToLogin(request, `${provider}_failed`);

  try {
    return await completeOAuthCallback({
      env,
      request,
      provider,
      code: url.searchParams.get("code") || "",
      state: url.searchParams.get("state") || "",
    });
  } catch (error) {
    console.error(
      `${provider} OAuth callback failed`,
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
    return redirectToLogin(request, oauthFailureReason(provider, error));
  }
};
