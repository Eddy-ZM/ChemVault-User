import {
  assertActorCanCreateSystemRole,
  parseAdminCreateUserPayload,
  type AdminCreateMailboxPayload,
} from "../../_shared/adminUsers";
import { getUserByEmail, publicUserColumns, toPublicUser } from "../../_shared/db";
import {
  evaluatePermission,
  loadAccessSnapshot,
  requireAdmin,
  toPublicMailAccount,
  writeAuditLog,
} from "../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import { hashPassword, randomId } from "../../_shared/security";
import type { Env, MailAccountRow, UserRow } from "../../_shared/types";

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

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    await assertActorCanCreateUsers(env, actor);

    const payload = parseAdminCreateUserPayload(await readJson(request));
    assertActorCanCreateSystemRole(actor, payload.systemRole);

    const existing = await getUserByEmail(env.DB, payload.email);
    if (existing) {
      throw new ApiError("EMAIL_ALREADY_EXISTS", "An account with this email already exists.", 409);
    }

    if (payload.mailAccount) {
      const existingMail = await env.DB
        .prepare(`SELECT id FROM mail_accounts WHERE mail_address = ? LIMIT 1`)
        .bind(payload.mailAccount.mailAddress)
        .first<{ id: string }>();
      if (existingMail) throw new ApiError("VALIDATION_ERROR", "Mail address already exists.", 409);
    }

    const now = new Date().toISOString();
    const passwordSource = payload.password || `${randomId("admin_password")}.${randomId("secret")}`;
    const user: UserRow = {
      id: randomId("user"),
      email: payload.email,
      password_hash: await hashPassword(passwordSource),
      name: payload.name,
      avatar_url: null,
      institution: payload.institution,
      field_of_interest: payload.fieldOfInterest,
      bio: null,
      website: null,
      role: payload.role,
      system_role: payload.systemRole,
      source: "admin_created",
      global_status: payload.status,
      status: payload.status,
      created_at: now,
      updated_at: now,
      last_login_at: null,
    };
    const mailRow = payload.mailAccount ? buildMailRow(user.id, payload.mailAccount, now) : null;

    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO users (
            id, email, password_hash, name, avatar_url, institution, field_of_interest,
            bio, website, role, system_role, source, global_status, status, created_at, updated_at, last_login_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          user.id,
          user.email,
          user.password_hash,
          user.name,
          user.avatar_url,
          user.institution,
          user.field_of_interest,
          user.bio,
          user.website,
          user.role,
          user.system_role,
          user.source,
          user.global_status,
          user.status,
          user.created_at,
          user.updated_at,
          user.last_login_at,
        ),
        ...defaultConnectedServiceStatements(env, user.id, now),
        ...(mailRow ? [mailInsertStatement(env, mailRow)] : []),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("unique")) {
        throw new ApiError("VALIDATION_ERROR", "User or mailbox already exists.", 409);
      }
      throw error;
    }

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      targetUserId: user.id,
      action: "user.create",
      resourceType: "user",
      resourceId: user.id,
      details: {
        email: user.email,
        role: user.role,
        systemRole: user.system_role,
        status: user.status,
        passwordSet: Boolean(payload.password),
        mailboxAssigned: Boolean(mailRow),
      },
    });

    if (mailRow) {
      await writeAuditLog({
        env,
        request,
        actorUserId: actor.id,
        targetUserId: user.id,
        action: "mail_account.create",
        resourceType: "mail_account",
        resourceId: mailRow.id,
        details: { mailAddress: mailRow.mail_address, createdWithUser: true, mailRuntimeAuthority: "mail_role" },
      });
    }

    return jsonResponse(
      request,
      {
        user: {
          ...toPublicUser(user),
          mailAddress: mailRow?.mail_address || null,
          mailStatus: mailRow?.mail_status || null,
        },
        mailAccount: mailRow ? toPublicMailAccount(mailRow) : null,
      },
      { status: 201 },
    );
  });

async function assertActorCanCreateUsers(env: Env, actor: UserRow): Promise<void> {
  if (actor.role === "admin" || ["admin", "super_admin", "owner"].includes(actor.system_role)) return;

  const snapshot = await loadAccessSnapshot(env.DB, actor);
  const decision = evaluatePermission(actor, snapshot, "admin:users:create");
  if (!decision.allowed) {
    throw new ApiError("FORBIDDEN", "User creation requires admin user creation permission.", 403);
  }
}

function buildMailRow(userId: string, payload: AdminCreateMailboxPayload, now: string): MailAccountRow {
  return {
    id: randomId("mail"),
    user_id: userId,
    mail_address: payload.mailAddress,
    mail_display_name: payload.displayName,
    mail_role: "mailbox_user",
    mail_status: "active",
    can_send: 1,
    can_receive: 1,
    can_login_mail: 1,
    mailbox_quota_mb: payload.mailboxQuotaMb,
    aliases: JSON.stringify(payload.aliases),
    created_at: now,
    updated_at: now,
  };
}

function defaultConnectedServiceStatements(env: Env, userId: string, now: string): D1PreparedStatement[] {
  return [
    ["search", "active"],
    ["extract", "active"],
    ["files", "active"],
    ["molecule", "coming_soon"],
    ["notif", "not_connected"],
  ].map(([service, status]) =>
    env.DB.prepare(
      `INSERT INTO connected_services (id, user_id, service, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(randomId("svc"), userId, service, status, now),
  );
}

function mailInsertStatement(env: Env, mailRow: MailAccountRow): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO mail_accounts (
      id, user_id, mail_address, mail_display_name, mail_role, mail_status,
      can_send, can_receive, can_login_mail, mailbox_quota_mb, aliases, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    mailRow.id,
    mailRow.user_id,
    mailRow.mail_address,
    mailRow.mail_display_name,
    mailRow.mail_role,
    mailRow.mail_status,
    mailRow.can_send,
    mailRow.can_receive,
    mailRow.can_login_mail,
    mailRow.mailbox_quota_mb,
    mailRow.aliases,
    mailRow.created_at,
    mailRow.updated_at,
  );
}
