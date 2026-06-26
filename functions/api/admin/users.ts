import { requireAdmin } from "../../_shared/permissions";
import { publicUserColumns, toPublicUser } from "../../_shared/db";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env, UserRow } from "../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    const url = new URL(request.url);
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();
    const role = (url.searchParams.get("role") || "").trim();
    const systemRole = (url.searchParams.get("systemRole") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const like = `%${search}%`;

    const rows = await env.DB.prepare(
      `SELECT ${publicUserColumns}, password_hash,
        (
          SELECT mail_address FROM mail_accounts
          WHERE mail_accounts.user_id = users.id AND mail_status != 'deleted'
          ORDER BY created_at DESC
          LIMIT 1
        ) AS mail_address,
        (
          SELECT mail_status FROM mail_accounts
          WHERE mail_accounts.user_id = users.id AND mail_status != 'deleted'
          ORDER BY created_at DESC
          LIMIT 1
        ) AS mail_status
       FROM users
       WHERE (? = '' OR lower(email) LIKE ? OR lower(name) LIKE ?)
        AND (? = '' OR role = ?)
        AND (? = '' OR COALESCE(system_role, 'user') = ?)
        AND (? = '' OR status = ? OR COALESCE(global_status, status, 'active') = ?)
       ORDER BY created_at DESC
       LIMIT 200`,
    )
      .bind(search, like, like, role, role, systemRole, systemRole, status, status, status)
      .all<UserRow & { mail_address?: string | null; mail_status?: string | null }>();

    return jsonResponse(request, {
      users: (rows.results || []).map((row) => ({
        ...toPublicUser(row),
        mailAddress: row.mail_address || null,
        mailStatus: row.mail_status || null,
      })),
    });
  });
