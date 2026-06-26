import {
  completeSsoLogin,
  upsertMailSsoUser,
  verifyMailSsoAssertion,
  type MailSsoAssertion,
} from "../../../../_shared/externalAuth";
import { handleApi, readJson } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const url = new URL(request.url);
    const assertion: MailSsoAssertion = {
      email: url.searchParams.get("email") || "",
      name: url.searchParams.get("name") || undefined,
      mailUserId: url.searchParams.get("mailUserId") || undefined,
      iat: url.searchParams.get("iat") || "",
      nonce: url.searchParams.get("nonce") || "",
      signature: url.searchParams.get("signature") || "",
      returnTo: url.searchParams.get("returnTo") || undefined,
    };
    const verified = await verifyMailSsoAssertion(env, assertion);
    const user = await upsertMailSsoUser(env, verified);
    return await completeSsoLogin({ env, request, user, returnTo: verified.returnTo });
  });

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const verified = await verifyMailSsoAssertion(env, await readJson<MailSsoAssertion>(request));
    const user = await upsertMailSsoUser(env, verified);
    return await completeSsoLogin({ env, request, user, returnTo: verified.returnTo });
  });
