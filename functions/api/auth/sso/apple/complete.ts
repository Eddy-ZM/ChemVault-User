import { completeAppleCallback } from "../../../../_shared/appleAuth";
import { handleApi, readJson } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const payload = (await readJson(request)) as {
      code?: unknown;
      state?: unknown;
      user?: unknown;
    };

    return await completeAppleCallback({
      env,
      request,
      code: typeof payload.code === "string" ? payload.code : "",
      state: typeof payload.state === "string" ? payload.state : "",
      userPayload: typeof payload.user === "string" ? payload.user : null,
    });
  });
