import { buildAppleAuthorizeRedirect } from "../../../../_shared/appleAuth";
import { handleApi } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const url = new URL(request.url);
    return await buildAppleAuthorizeRedirect({ env, request, returnTo: url.searchParams.get("returnTo") });
  });

