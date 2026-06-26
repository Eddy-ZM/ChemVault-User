import { insertDefaultServices } from "../../../_shared/db";
import { mailSyncRoleToSystemRole, requireAdmin, writeAuditLog } from "../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../_shared/responses";
import { randomId } from "../../../_shared/security";
import type { Env, SystemRole, UserRow } from "../../../_shared/types";
import { normalizeEmail, validateEmail } from "../../../_shared/validators";

interface SyncUserInput {
  email: string;
  name: string;
  mailRole: "super" | "admin";
}

function parseUsers(input: unknown): SyncUserInput[] {
  const payload = input as { superUsers?: unknown; adminUsers?: unknown };
  const merged = new Map<string, SyncUserInput>();

  for (const [key, mailRole] of [
    ["adminUsers", "admin"],
    ["superUsers", "super"],
  ] as const) {
    const list = payload[key];
    if (!Array.isArray(list)) continue;

    for (const item of list) {
      const row = item as { email?: unknown; name?: unknown };
      const email = typeof row.email === "string" ? normalizeEmail(row.email) : "";
      if (!validateEmail(email)) throw new ApiError("VALIDATION_ERROR", `Invalid email in ${key}.`, 400);
      const name = typeof row.name === "string" && row.name.trim() ? row.name.trim().slice(0, 160) : email;
      merged.set(email, { email, name, mailRole });
    }
  }

  return [...merged.values()];
}

async function upsertMailAdmin(input: {
  env: Env;
  now: string;
  email: string;
  name: string;
  nextSystemRole: SystemRole;
  mailRole: "super" | "admin";
}): Promise<"created" | "updated" | "skipped"> {
  const existing = await input.env.DB.prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`)
    .bind(input.email)
    .first<UserRow>();

  await input.env.DB.prepare(
    `INSERT OR REPLACE INTO mail_admin_sync (id, email, mail_role, display_name, source, synced_at)
     VALUES (COALESCE((SELECT id FROM mail_admin_sync WHERE email = ?), ?), ?, ?, ?, 'mail_system', ?)`,
  )
    .bind(input.email, randomId("mailsync"), input.email, input.mailRole, input.name, input.now)
    .run();

  if (!existing) {
    const id = randomId("user");
    await input.env.DB.prepare(
      `INSERT INTO users (
        id, email, password_hash, name, avatar_url, institution, field_of_interest,
        bio, website, role, system_role, source, global_status, status, created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, 'admin', ?, 'mail_system', 'active', 'active', ?, ?, NULL)`,
    )
      .bind(id, input.email, "mail_system_sso_only", input.name, input.nextSystemRole, input.now, input.now)
      .run();
    await insertDefaultServices(input.env.DB, id, input.now);
    return "created";
  }

  if (existing.system_role === "owner") return "skipped";
  if (existing.source === "mail_system" && existing.system_role === "super_admin" && input.nextSystemRole !== "super_admin") {
    return "skipped";
  }

  await input.env.DB.prepare(
    `UPDATE users
     SET name = COALESCE(NULLIF(name, ''), ?),
      role = CASE WHEN role = 'admin' THEN role ELSE 'admin' END,
      system_role = ?,
      source = CASE WHEN source = 'local' THEN 'mail_system' ELSE source END,
      global_status = 'active',
      status = 'active',
      updated_at = ?
     WHERE email = ?`,
  )
    .bind(input.name, input.nextSystemRole, input.now, input.email)
    .run();

  return "updated";
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const users = parseUsers(await readJson(request));
    const now = new Date().toISOString();
    const counts = { created: 0, updated: 0, skipped: 0 };

    for (const user of users) {
      const result = await upsertMailAdmin({
        env,
        now,
        email: user.email,
        name: user.name,
        mailRole: user.mailRole,
        nextSystemRole: mailSyncRoleToSystemRole(user.mailRole),
      });
      counts[result] += 1;
    }

    await env.DB.prepare(`INSERT INTO admin_sync_logs (id, source, action, details, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(randomId("sync"), "mail_system_manual", "manual_sync", JSON.stringify(counts), now)
      .run();

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      action: "mail_admin_sync.manual",
      resourceType: "mail_admin_sync",
      details: counts,
    });

    return jsonResponse(request, counts);
  });
