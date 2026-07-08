import { getAuthContext } from "../../../_shared/auth";
import { createUserSystemHandoffToken } from "../../../_shared/handoff";
import { handleApi } from "../../../_shared/responses";
import { sanitizeReturnTo } from "../../../_shared/returnTo";
import type { Env } from "../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const requestUrl = new URL(request.url);
    const returnTo = sanitizeReturnTo(requestUrl.searchParams.get("returnTo"), "/dashboard");
    const context = await getAuthContext(env, request);

    if (!context) {
      const handoffUrl = new URL("/api/auth/handoff/start", requestUrl.origin);
      handoffUrl.searchParams.set("returnTo", returnTo);

      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("returnTo", handoffUrl.toString());
      return Response.redirect(loginUrl.toString(), 302);
    }

    const destination = new URL(returnTo, requestUrl.origin);
    const token = await createUserSystemHandoffToken(env, context.user, "chemvault-lab");

    destination.searchParams.set("token", token);
    destination.searchParams.set("provider", "chemvault-user");
    return Response.redirect(destination.toString(), 302);
  });
