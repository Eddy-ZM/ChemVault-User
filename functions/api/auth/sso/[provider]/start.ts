import { requireUser } from "../../../../_shared/auth";
import { buildOAuthAuthorizeRedirect, isOAuthProvider } from "../../../../_shared/oauthAuth";
import { ApiError, handleApi } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const provider = String(params.provider || "");
    if (!isOAuthProvider(provider)) throw new ApiError("VALIDATION_ERROR", "OAuth provider is not supported.", 400);

    const url = new URL(request.url);
    if (url.searchParams.get("mode") === "link") {
      const { user } = await requireUser(env, request);
      return await buildOAuthAuthorizeRedirect({
        env,
        request,
        provider,
        mode: "link",
        userId: user.id,
        returnTo: url.searchParams.get("returnTo") || `/settings/security?sso=${provider}_linked`,
      });
    }

    return await buildOAuthAuthorizeRedirect({
      env,
      request,
      provider,
      returnTo: url.searchParams.get("returnTo"),
    });
  });
