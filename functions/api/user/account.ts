import { clearSessionCookie, requireUser } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";
import { permanentlyDeleteUser } from "../../_shared/userDeletion";

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const { deletedUser, lifecycleJob } = await permanentlyDeleteUser({
      env,
      request,
      target: user,
      actorUserId: user.id,
      action: "self_delete",
    });

    return jsonResponse(
      request,
      {
        ok: lifecycleJob.status === "completed",
        pending: lifecycleJob.status !== "completed",
        deletedUser,
        lifecycleJobId: lifecycleJob.id,
        lifecycleStatus: lifecycleJob.status,
      },
      {
        status: lifecycleJob.status === "completed" ? 200 : 202,
        headers: { "Set-Cookie": clearSessionCookie(env, request) },
      },
    );
  });
