import { writeAuditLog } from "./permissions";
import { runDistributedLifecycleAction, type LifecycleRun } from "./lifecycle";
import type { Env, UserRow } from "./types";

export interface DeletedUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  systemRole: string;
  source: string;
  status: string;
  globalStatus: string;
}

export function buildDeletedUserRecord(user: UserRow): DeletedUserRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    systemRole: user.system_role,
    source: user.source,
    status: user.status,
    globalStatus: user.global_status,
  };
}

export interface DeleteUserResult {
  deletedUser: DeletedUserRecord;
  lifecycleJob: LifecycleRun;
}

export async function permanentlyDeleteUser(input: {
  env: Env;
  request: Request;
  target: UserRow;
  actorUserId?: string | null;
  action: "self_delete" | "admin_delete";
}): Promise<DeleteUserResult> {
  const deletedUser = buildDeletedUserRecord(input.target);
  await input.env.DB.batch([
    input.env.DB
      .prepare(`UPDATE users SET status = 'deletion_pending', global_status = 'deletion_pending', updated_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), input.target.id),
    input.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(input.target.id),
  ]);

  const lifecycleJob = await runDistributedLifecycleAction({
    env: input.env,
    target: input.target,
    actorUserId: input.actorUserId,
    action: "delete",
  });
  if (lifecycleJob.status !== "completed") {
    await writeAuditLog({
      env: input.env,
      request: input.request,
      actorUserId: input.actorUserId || null,
      targetUserId: input.target.id,
      action: "user.delete.pending",
      resourceType: "user",
      resourceId: input.target.id,
      details: {
        lifecycleJobId: lifecycleJob.id,
        services: lifecycleJob.results.map((result) => ({ service: result.service, status: result.status })),
      },
    });
    return { deletedUser, lifecycleJob };
  }

  await input.env.DB.prepare(`DELETE FROM audit_logs WHERE actor_user_id = ? OR target_user_id = ?`)
    .bind(input.target.id, input.target.id)
    .run();

  await writeAuditLog({
    env: input.env,
    request: input.request,
    actorUserId: input.actorUserId || null,
    targetUserId: input.target.id,
    action: input.action === "self_delete" ? "user.delete.self" : "user.delete.admin",
    resourceType: "user",
    resourceId: input.target.id,
    details: {
      lifecycleJobId: lifecycleJob.id,
      deletionMode: "distributed_hard_delete",
      services: lifecycleJob.results.map((result) => ({ service: result.service, status: result.status })),
    },
  });

  await input.env.DB.batch([
    input.env.DB.prepare(`DELETE FROM external_identities WHERE user_id = ?`).bind(input.target.id),
    input.env.DB.prepare(`DELETE FROM mail_accounts WHERE user_id = ?`).bind(input.target.id),
    input.env.DB.prepare(`DELETE FROM connected_services WHERE user_id = ?`).bind(input.target.id),
    input.env.DB.prepare(`DELETE FROM usage_logs WHERE user_id = ?`).bind(input.target.id),
    input.env.DB.prepare(`DELETE FROM user_permissions WHERE user_id = ?`).bind(input.target.id),
    input.env.DB.prepare(`DELETE FROM service_access WHERE user_id = ?`).bind(input.target.id),
    input.env.DB.prepare(`DELETE FROM page_access WHERE user_id = ?`).bind(input.target.id),
    input.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(input.target.id),
  ]);

  return { deletedUser, lifecycleJob };
}
