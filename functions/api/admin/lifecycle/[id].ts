import { requireAdmin } from "../../../_shared/auth";
import { permanentlyDeleteUser } from "../../../_shared/userDeletion";
import { ApiError, handleApi, jsonResponse } from "../../../_shared/responses";
import { getUserById } from "../../../_shared/db";
import type { Env } from "../../../_shared/types";

interface LifecycleJobRow {
  id: string;
  action: "export" | "delete";
  subject_user_id: string;
  actor_user_id: string | null;
  status: "running" | "completed" | "failed";
  service_results_json: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

async function loadJob(env: Env, id: string): Promise<LifecycleJobRow> {
  const job = await env.DB.prepare(
    `SELECT id, action, subject_user_id, actor_user_id, status, service_results_json,
            created_at, updated_at, completed_at
     FROM lifecycle_jobs WHERE id = ?`,
  )
    .bind(id)
    .first<LifecycleJobRow>();
  if (!job) throw new ApiError("VALIDATION_ERROR", "Lifecycle job not found.", 404);
  return job;
}

function publicJob(job: LifecycleJobRow) {
  let services: unknown[] = [];
  try {
    const parsed = JSON.parse(job.service_results_json || "[]");
    if (Array.isArray(parsed)) services = parsed;
  } catch {
    services = [];
  }
  return {
    id: job.id,
    action: job.action,
    subjectUserId: job.subject_user_id,
    status: job.status,
    services,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    return jsonResponse(request, { job: publicJob(await loadJob(env, String(params.id || ""))) });
  });

export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const previous = await loadJob(env, String(params.id || ""));
    if (previous.action !== "delete" || previous.status !== "failed") {
      throw new ApiError("VALIDATION_ERROR", "Only failed deletion jobs can be retried.", 409);
    }

    const target = await getUserById(env.DB, previous.subject_user_id);
    if (!target) throw new ApiError("VALIDATION_ERROR", "The lifecycle subject no longer exists.", 404);
    const result = await permanentlyDeleteUser({
      env,
      request,
      target,
      actorUserId: actor.id,
      action: "admin_delete",
    });

    return jsonResponse(
      request,
      {
        ok: result.lifecycleJob.status === "completed",
        retriedFrom: previous.id,
        lifecycleJobId: result.lifecycleJob.id,
        lifecycleStatus: result.lifecycleJob.status,
      },
      { status: result.lifecycleJob.status === "completed" ? 200 : 202 },
    );
  });
