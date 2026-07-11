import { exportLocalUserData, runDistributedLifecycleAction } from "../../_shared/lifecycle";
import { requireUser } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const [local, lifecycleJob] = await Promise.all([
      exportLocalUserData(env, user),
      runDistributedLifecycleAction({ env, target: user, actorUserId: user.id, action: "export" }),
    ]);

    return jsonResponse(request, {
      ok: lifecycleJob.status === "completed",
      complete: lifecycleJob.status === "completed",
      lifecycleJobId: lifecycleJob.id,
      exportedAt: new Date().toISOString(),
      data: {
        userCenter: local,
        services: Object.fromEntries(lifecycleJob.results.map((result) => [result.service, result.data || null])),
      },
      serviceStatus: lifecycleJob.results.map(({ data: _data, ...result }) => result),
    });
  });
