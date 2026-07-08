import { requireUser } from "../../../_shared/auth";
import { createUserSystemHandoffToken } from "../../../_shared/handoff";
import { handleApi } from "../../../_shared/responses";
import { sanitizeReturnTo } from "../../../_shared/returnTo";
import type { Env } from "../../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const requestUrl = new URL(request.url);
    const returnTo = sanitizeReturnTo(requestUrl.searchParams.get("returnTo"), "/dashboard");
    const destination = new URL(returnTo, requestUrl.origin);
    const token = await createUserSystemHandoffToken(env, user, "chemvault-lab");

    destination.searchParams.set("token", token);
    destination.searchParams.set("provider", "chemvault-user");
    return Response.redirect(destination.toString(), 302);
  });
