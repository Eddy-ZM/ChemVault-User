import { getUserById } from "../../../_shared/db";
import { ApiError, handleApi, jsonResponse } from "../../../_shared/responses";
import type { Env } from "../../../_shared/types";
import { permanentlyDeleteUser } from "../../../_shared/userDeletion";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  handleApi(request, async () => {
    const authorization = request.headers.get("authorization") || "";
    if (!env.LIFECYCLE_RECONCILE_SECRET || authorization !== `Bearer ${env.LIFECYCLE_RECONCILE_SECRET}`) {
      throw new ApiError("UNAUTHORIZED", "Invalid lifecycle reconciliation credential.", 401);
    }
    const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
    const jobs = await env.DB.prepare(
      `SELECT id, subject_user_id
         FROM lifecycle_jobs
        WHERE action = 'delete' AND status = 'failed' AND updated_at <= ?
        ORDER BY updated_at ASC
        LIMIT 25`,
    ).bind(cutoff).all<{ id: string; subject_user_id: string }>();

    const results: Array<Record<string, unknown>> = [];
    for (const job of jobs.results || []) {
      const target = await getUserById(env.DB, job.subject_user_id);
      if (!target || target.status !== "deletion_pending") {
        results.push({ previousJobId: job.id, status: "skipped", reason: "subject_not_pending" });
        continue;
      }
      const retried = await permanentlyDeleteUser({
        env,
        request,
        target,
        actorUserId: null,
        action: "admin_delete",
      });
      results.push({
        previousJobId: job.id,
        lifecycleJobId: retried.lifecycleJob.id,
        status: retried.lifecycleJob.status,
      });
    }

    return jsonResponse(request, {
      ok: results.every((result) => result.status === "completed" || result.status === "skipped"),
      cutoff,
      attempted: results.length,
      results,
    });
  });
