import { requireUser } from "../../../../_shared/auth";
import { buildAppleClientOptions } from "../../../../_shared/appleAuth";
import { handleApi, jsonResponse } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") === "link" ? "link" : "login";
    const userId = mode === "link" ? (await requireUser(env, request)).user.id : undefined;
    const options = await buildAppleClientOptions({
      env,
      request,
      mode,
      userId,
      returnTo: url.searchParams.get("returnTo"),
    });

    return jsonResponse(request, options);
  });
