import { handleApi, jsonResponse } from "../../../../_shared/responses";
import { isTurnstileRequired, mailSsoTurnstileAction } from "../../../../_shared/turnstile";
import type { Env } from "../../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () =>
    jsonResponse(request, {
      turnstile: {
        siteKey: env.TURNSTILE_SITE_KEY || null,
        required: isTurnstileRequired(env),
        action: mailSsoTurnstileAction,
        mode: "background",
      },
      mailSsoConfigured: Boolean(env.MAIL_SYSTEM_SSO_URL),
    }),
  );
