import { completeAppleCallback, readAppleCallbackPayload, redirectToLogin } from "../../../../_shared/appleAuth";
import { handleApi } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

async function handleAppleCallback(env: Env, request: Request): Promise<Response> {
  const payload = await readAppleCallbackPayload(request);
  if (payload.error) return redirectToLogin(request, "apple_failed");

  try {
    return await completeAppleCallback({
      env,
      request,
      code: payload.code,
      state: payload.state,
      userPayload: payload.userPayload,
    });
  } catch (error) {
    console.error("Apple SSO callback failed", error instanceof Error ? error.message : String(error));
    return redirectToLogin(request, "apple_failed");
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => await handleAppleCallback(env, request));

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => await handleAppleCallback(env, request));

