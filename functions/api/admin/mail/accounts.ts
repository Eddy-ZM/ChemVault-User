import { getUserById } from "../../../_shared/db";
import { assertActorCanManageTarget, requireAdmin, toPublicMailAccount, writeAuditLog } from "../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../_shared/responses";
import { randomId } from "../../../_shared/security";
import type { Env, MailAccountRow, MailStatus } from "../../../_shared/types";
import { normalizeEmail, validateEmail, validateMailStatus } from "../../../_shared/validators";

interface CreateMailPayload {
  userId: string;
  mailAddress: string;
  displayName: string | null;
  mailStatus: MailStatus;
  mailboxQuotaMb: number;
  aliases: string[];
}

function parseAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeEmail(item))
    .filter((item) => validateEmail(item))
    .slice(0, 20);
}

function parseCreatePayload(input: unknown): CreateMailPayload {
  const payload = input as Record<string, unknown>;
  const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
  const mailAddress = typeof payload.mailAddress === "string" ? normalizeEmail(payload.mailAddress) : "";
  const displayName = typeof payload.displayName === "string" ? payload.displayName.trim().slice(0, 160) || null : null;
  const mailboxQuotaMb = Number(payload.mailboxQuotaMb ?? 1024);

  if (!userId) throw new ApiError("VALIDATION_ERROR", "userId is required.", 400);
  if (!validateEmail(mailAddress)) throw new ApiError("VALIDATION_ERROR", "A valid mailAddress is required.", 400);
  if (!Number.isInteger(mailboxQuotaMb) || mailboxQuotaMb < 0) {
    throw new ApiError("VALIDATION_ERROR", "mailboxQuotaMb must be a non-negative integer.", 400);
  }

  return {
    userId,
    mailAddress,
    displayName,
    mailStatus: validateMailStatus(payload.mailStatus || "active"),
    mailboxQuotaMb,
    aliases: parseAliases(payload.aliases),
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    const url = new URL(request.url);
    const search = (url.searchParams.get("q") || "").trim().toLowerCase();
    const status = (url.searchParams.get("status") || "").trim();
    const like = `%${search}%`;

    const rows = await env.DB.prepare(
      `SELECT mail_accounts.*,
        users.email AS user_email,
        users.name AS user_name
       FROM mail_accounts
       LEFT JOIN users ON users.id = mail_accounts.user_id
       WHERE mail_status != 'deleted'
        AND (? = '' OR lower(mail_address) LIKE ? OR lower(COALESCE(users.email, '')) LIKE ? OR lower(COALESCE(users.name, '')) LIKE ?)
        AND (? = '' OR mail_status = ?)
       ORDER BY mail_accounts.created_at DESC
       LIMIT 200`,
    )
      .bind(search, like, like, like, status, status)
      .all<MailAccountRow & { user_email: string | null; user_name: string | null }>();

    return jsonResponse(request, {
      accounts: (rows.results || []).map((row) => ({
        ...toPublicMailAccount(row),
        user: row.user_email ? { email: row.user_email, name: row.user_name } : null,
      })),
    });
  });

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const payload = parseCreatePayload(await readJson(request));
    const target = await getUserById(env.DB, payload.userId);
    if (!target) throw new ApiError("VALIDATION_ERROR", "User not found.", 404);
    assertActorCanManageTarget({ actor, target, action: "mail" });

    const id = randomId("mail");
    const now = new Date().toISOString();
    try {
      await env.DB.prepare(
        `INSERT INTO mail_accounts (
          id, user_id, mail_address, mail_display_name, mail_role, mail_status,
          can_send, can_receive, can_login_mail, mailbox_quota_mb, aliases, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          target.id,
          payload.mailAddress,
          payload.displayName,
          "mailbox_user",
          payload.mailStatus,
          1,
          1,
          1,
          payload.mailboxQuotaMb,
          JSON.stringify(payload.aliases),
          now,
          now,
        )
        .run();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Mail address already exists.", 409);
    }

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "mail_account.create",
      resourceType: "mail_account",
      resourceId: id,
      details: { mailAddress: payload.mailAddress, mailRuntimeAuthority: "mail_role" },
    });

    const row = await env.DB.prepare(`SELECT * FROM mail_accounts WHERE id = ?`).bind(id).first<MailAccountRow>();
    return jsonResponse(request, { account: row ? toPublicMailAccount(row) : null }, { status: 201 });
  });
