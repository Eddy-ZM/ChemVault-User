import { clearSessionCookie, requireUser } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";
import { permanentlyDeleteUser } from "../../_shared/userDeletion";

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const deletedUser = await permanentlyDeleteUser({
      env,
      request,
      target: user,
      actorUserId: user.id,
      action: "self_delete",
    });

    return jsonResponse(request, { ok: true, deletedUser }, { headers: { "Set-Cookie": clearSessionCookie(env, request) } });
  });
