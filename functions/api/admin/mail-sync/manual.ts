import { requireAdmin, writeAuditLog } from "../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../_shared/responses";
import { randomId } from "../../../_shared/security";
import type { Env } from "../../../_shared/types";
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
  mailRole: "super" | "admin";
}): Promise<"created" | "updated" | "skipped"> {
  const existing = await input.env.DB.prepare(`SELECT id FROM mail_admin_sync WHERE email = ? AND mail_role = ? LIMIT 1`)
    .bind(input.email, input.mailRole)
    .first<{ id: string }>();

  await input.env.DB.prepare(
    `INSERT OR REPLACE INTO mail_admin_sync (id, email, mail_role, display_name, source, synced_at)
     VALUES (COALESCE((SELECT id FROM mail_admin_sync WHERE email = ?), ?), ?, ?, ?, 'mail_system', ?)`,
  )
    .bind(input.email, randomId("mailsync"), input.email, input.mailRole, input.name, input.now)
    .run();

  return existing ? "updated" : "created";
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
      details: { ...counts, authorizationSource: "user_system", importedAuthority: "record_only" },
    });

    return jsonResponse(request, counts);
  });
