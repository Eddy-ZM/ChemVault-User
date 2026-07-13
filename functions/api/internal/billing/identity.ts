import { requireBillingServiceSecret, resolveBillingIdentity } from "../../../_shared/billingIdentity";
import { handleApi, jsonResponse } from "../../../_shared/responses";
import type { Env } from "../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  handleApi(request, async () => {
    requireBillingServiceSecret(env, request);
    const email = new URL(request.url).searchParams.get("email");
    const user = await resolveBillingIdentity(env, email);
    return jsonResponse(request, { ok: true, user });
  });
