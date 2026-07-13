import { ApiError } from "./responses";
import type { Env, UserRow } from "./types";

export type LifecycleAction = "export" | "delete";
export type LifecycleServiceName = "billing" | "files" | "lab" | "notifications" | "mail" | "extract";

export interface LifecycleServiceConfig {
  name: LifecycleServiceName;
  url?: string;
}

export interface LifecycleServiceResult {
  service: LifecycleServiceName;
  status: "completed" | "failed";
  httpStatus?: number;
  error?: string;
  data?: unknown;
}

export interface LifecycleRun {
  id: string;
  action: LifecycleAction;
  status: "completed" | "failed";
  results: LifecycleServiceResult[];
}

const allServices: LifecycleServiceName[] = ["billing", "files", "lab", "notifications", "mail", "extract"];

export function getLifecycleServiceConfigs(env: Env): LifecycleServiceConfig[] {
  const configured: Record<LifecycleServiceName, string | undefined> = {
    billing: env.BILLING_LIFECYCLE_URL,
    files: env.FILES_LIFECYCLE_URL,
    lab: env.LAB_LIFECYCLE_URL,
    notifications: env.NOTIFICATIONS_LIFECYCLE_URL,
    mail: env.MAIL_LIFECYCLE_URL,
    extract: env.EXTRACT_LIFECYCLE_URL,
  };
  const requested = (env.LIFECYCLE_REQUIRED_SERVICES || allServices.join(","))
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is LifecycleServiceName => allServices.includes(value as LifecycleServiceName));
  const required = [...new Set(requested)];

  return required.map((name) => ({ name, url: configured[name]?.replace(/\/$/, "") }));
}

function compactError(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value || "Unknown lifecycle service error");
  return message.replace(/\s+/g, " ").slice(0, 240);
}

export async function callLifecycleServices(input: {
  services: LifecycleServiceConfig[];
  secret: string;
  action: LifecycleAction;
  userId: string;
  email: string;
  requestId: string;
  timeoutMs?: number;
}): Promise<LifecycleServiceResult[]> {
  return Promise.all(
    input.services.map(async (service): Promise<LifecycleServiceResult> => {
      if (!service.url) {
        return { service: service.name, status: "failed", error: "Service lifecycle URL is not configured." };
      }

      try {
        const response = await fetch(`${service.url}/${encodeURIComponent(input.userId)}`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${input.secret}`,
            "content-type": "application/json",
            "x-chemvault-lifecycle-request": input.requestId,
          },
          body: JSON.stringify({ action: input.action, email: input.email, requestId: input.requestId }),
          signal: AbortSignal.timeout(input.timeoutMs || 12_000),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const remoteError = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : `HTTP ${response.status}`;
          return { service: service.name, status: "failed", httpStatus: response.status, error: compactError(remoteError) };
        }
        return { service: service.name, status: "completed", httpStatus: response.status, data: payload };
      } catch (error) {
        return { service: service.name, status: "failed", error: compactError(error) };
      }
    }),
  );
}

function summarizeResults(results: LifecycleServiceResult[]): Omit<LifecycleServiceResult, "data">[] {
  return results.map(({ data: _data, ...result }) => result);
}

export async function runDistributedLifecycleAction(input: {
  env: Env;
  target: UserRow;
  actorUserId?: string | null;
  action: LifecycleAction;
}): Promise<LifecycleRun> {
  const secret = input.env.LIFECYCLE_SERVICE_SECRET?.trim();
  if (!secret) throw new ApiError("INTERNAL_ERROR", "Account lifecycle service is not configured.", 503);

  const id = `lifecycle_${crypto.randomUUID().replace(/-/g, "")}`;
  const now = new Date().toISOString();
  await input.env.DB.prepare(
    `INSERT INTO lifecycle_jobs (
       id, action, subject_user_id, actor_user_id, status, service_results_json,
       created_at, updated_at, completed_at
     ) VALUES (?, ?, ?, ?, 'running', '[]', ?, ?, NULL)`,
  )
    .bind(id, input.action, input.target.id, input.actorUserId || null, now, now)
    .run();

  const results = await callLifecycleServices({
    services: getLifecycleServiceConfigs(input.env),
    secret,
    action: input.action,
    userId: input.target.id,
    email: input.target.email,
    requestId: id,
  });
  const status = results.length > 0 && results.every((result) => result.status === "completed") ? "completed" : "failed";
  const completedAt = new Date().toISOString();
  await input.env.DB.prepare(
    `UPDATE lifecycle_jobs
     SET status = ?, service_results_json = ?, updated_at = ?, completed_at = ?
     WHERE id = ?`,
  )
    .bind(status, JSON.stringify(summarizeResults(results)), completedAt, completedAt, id)
    .run();

  return { id, action: input.action, status, results };
}

export async function exportLocalUserData(env: Env, user: UserRow): Promise<Record<string, unknown>> {
  const [sessions, identities, mailAccounts, connectedServices, usage, permissions, services, pages] = await Promise.all([
    env.DB.prepare(`SELECT id, created_at, expires_at, user_agent, ip FROM sessions WHERE user_id = ?`).bind(user.id).all(),
    env.DB.prepare(
      `SELECT id, provider, provider_user_id, provider_email, expires_at, avatar_url, metadata, created_at, updated_at
       FROM external_identities WHERE user_id = ?`,
    )
      .bind(user.id)
      .all(),
    env.DB.prepare(
      `SELECT id, mail_address, mail_display_name, mail_role, mail_status, can_send, can_receive,
              can_login_mail, mailbox_quota_mb, aliases, created_at, updated_at
       FROM mail_accounts WHERE user_id = ?`,
    )
      .bind(user.id)
      .all(),
    env.DB.prepare(`SELECT id, service, status, created_at FROM connected_services WHERE user_id = ?`).bind(user.id).all(),
    env.DB.prepare(`SELECT id, service, action, amount, created_at FROM usage_logs WHERE user_id = ?`).bind(user.id).all(),
    env.DB.prepare(
      `SELECT id, permission_key, effect, granted_by, created_at, updated_at FROM user_permissions WHERE user_id = ?`,
    )
      .bind(user.id)
      .all(),
    env.DB.prepare(`SELECT id, service_key, status, granted_by, created_at, updated_at FROM service_access WHERE user_id = ?`)
      .bind(user.id)
      .all(),
    env.DB.prepare(`SELECT id, page_key, status, granted_by, created_at, updated_at FROM page_access WHERE user_id = ?`)
      .bind(user.id)
      .all(),
  ]);

  const { password_hash: _passwordHash, ...profile } = user;
  return {
    exportedAt: new Date().toISOString(),
    profile,
    sessions: sessions.results,
    externalIdentities: identities.results,
    mailAccounts: mailAccounts.results,
    connectedServices: connectedServices.results,
    usage: usage.results,
    permissions: permissions.results,
    serviceAccess: services.results,
    pageAccess: pages.results,
  };
}
