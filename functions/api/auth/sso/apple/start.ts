import { requireUser } from "../../../../_shared/auth";
import { buildAppleAuthorizeRedirect } from "../../../../_shared/appleAuth";
import { handleApi } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const url = new URL(request.url);
    if (url.searchParams.get("mode") === "link") {
      const { user } = await requireUser(env, request);
      return await buildAppleAuthorizeRedirect({
        env,
        request,
        mode: "link",
        userId: user.id,
        returnTo: url.searchParams.get("returnTo") || "/settings/security?apple=linked",
      });
    }

    return await buildAppleAuthorizeRedirect({ env, request, returnTo: url.searchParams.get("returnTo") });
  });
