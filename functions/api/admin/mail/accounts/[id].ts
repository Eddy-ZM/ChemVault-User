import { getUserById } from "../../../../_shared/db";
import { assertActorCanManageTarget, requireAdmin, toPublicMailAccount, writeAuditLog } from "../../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../../_shared/responses";
import type { Env, MailAccountRow } from "../../../../_shared/types";
import { normalizeEmail, validateEmail, validateMailRole, validateMailStatus } from "../../../../_shared/validators";

async function loadMailAccount(db: D1Database, id: string): Promise<MailAccountRow> {
  const row = await db.prepare(`SELECT * FROM mail_accounts WHERE id = ? LIMIT 1`).bind(id).first<MailAccountRow>();
  if (!row || row.mail_status === "deleted") throw new ApiError("VALIDATION_ERROR", "Mail account not found.", 404);
  return row;
}

function boolNumber(value: unknown): number | null {
  return typeof value === "boolean" ? (value ? 1 : 0) : null;
}

function parseAliases(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeEmail(item))
    .filter((item) => validateEmail(item))
    .slice(0, 20);
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    const row = await loadMailAccount(env.DB, String(params.id || ""));
    return jsonResponse(request, { account: toPublicMailAccount(row) });
  });

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const row = await loadMailAccount(env.DB, String(params.id || ""));
    const target = await getUserById(env.DB, row.user_id);
    if (!target) throw new ApiError("VALIDATION_ERROR", "Bound user not found.", 404);
    assertActorCanManageTarget({ actor, target, action: "mail" });

    const payload = (await readJson(request)) as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [];

    if (Object.hasOwn(payload, "mailAddress")) {
      const mailAddress = typeof payload.mailAddress === "string" ? normalizeEmail(payload.mailAddress) : "";
      if (!validateEmail(mailAddress)) throw new ApiError("VALIDATION_ERROR", "A valid mailAddress is required.", 400);
      updates.push("mail_address = ?");
      values.push(mailAddress);
    }

    if (Object.hasOwn(payload, "displayName")) {
      const displayName = typeof payload.displayName === "string" ? payload.displayName.trim().slice(0, 160) || null : null;
      updates.push("mail_display_name = ?");
      values.push(displayName);
    }

    if (Object.hasOwn(payload, "mailRole")) {
      updates.push("mail_role = ?");
      values.push(validateMailRole(payload.mailRole));
    }

    if (Object.hasOwn(payload, "mailStatus")) {
      updates.push("mail_status = ?");
      values.push(validateMailStatus(payload.mailStatus));
    }

    for (const [field, column] of [
      ["canSend", "can_send"],
      ["canReceive", "can_receive"],
      ["canLoginMail", "can_login_mail"],
    ] as const) {
      if (Object.hasOwn(payload, field)) {
        const value = boolNumber(payload[field]);
        if (value === null) throw new ApiError("VALIDATION_ERROR", `${field} must be boolean.`, 400);
        updates.push(`${column} = ?`);
        values.push(value);
      }
    }

    if (Object.hasOwn(payload, "mailboxQuotaMb")) {
      const quota = Number(payload.mailboxQuotaMb);
      if (!Number.isInteger(quota) || quota < 0) {
        throw new ApiError("VALIDATION_ERROR", "mailboxQuotaMb must be a non-negative integer.", 400);
      }
      updates.push("mailbox_quota_mb = ?");
      values.push(quota);
    }

    if (Object.hasOwn(payload, "aliases")) {
      const aliases = parseAliases(payload.aliases);
      if (!aliases) throw new ApiError("VALIDATION_ERROR", "aliases must be an array.", 400);
      updates.push("aliases = ?");
      values.push(JSON.stringify(aliases));
    }

    if (!updates.length) throw new ApiError("VALIDATION_ERROR", "No mail account fields were provided.", 400);

    const now = new Date().toISOString();
    updates.push("updated_at = ?");
    values.push(now, row.id);

    try {
      await env.DB.prepare(`UPDATE mail_accounts SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Mail address already exists.", 409);
    }

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "mail_account.update",
      resourceType: "mail_account",
      resourceId: row.id,
      details: payload,
    });

    const updated = await loadMailAccount(env.DB, row.id);
    return jsonResponse(request, { account: toPublicMailAccount(updated) });
  });

export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const row = await loadMailAccount(env.DB, String(params.id || ""));
    const target = await getUserById(env.DB, row.user_id);
    if (!target) throw new ApiError("VALIDATION_ERROR", "Bound user not found.", 404);
    assertActorCanManageTarget({ actor, target, action: "mail" });

    const now = new Date().toISOString();
    await env.DB.prepare(`UPDATE mail_accounts SET mail_status = 'deleted', updated_at = ? WHERE id = ?`)
      .bind(now, row.id)
      .run();

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "mail_account.delete",
      resourceType: "mail_account",
      resourceId: row.id,
      details: { mailAddress: row.mail_address },
    });

    return jsonResponse(request, { ok: true });
  });
