import { describe, expect, it } from "vitest";
import { bindVerifiedMailAccount, type MailPasswordAuthResult } from "../functions/_shared/externalAuth";
import type { Env, ExternalIdentityRow, MailAccountRow, UserRow } from "../functions/_shared/types";

describe("mail account binding", () => {
  it("binds a verified ChemVault Mail account without granting user-system authority", async () => {
    const db = new BindingMockD1();
    const user = db.insertUser("researcher@example.edu", "Researcher", { source: "google" });
    const account = await bindVerifiedMailAccount({
      env: { DB: db as unknown as D1Database } as Env,
      request: new Request("https://user.chemvault.science/api/user/mail-binding", {
        headers: { "user-agent": "vitest" },
      }),
      user,
      mail: mailResult({ mailRole: "mailbox_admin" }),
    });

    expect(account).toMatchObject({
      userId: user.id,
      mailAddress: "researcher@chemvault.science",
      mailRole: "mailbox_admin",
    });
    expect(db.users.get(user.id)?.system_role).toBe("user");
    expect(db.serviceAccess.get(`${user.id}:chemvault_mail`)).toBeUndefined();
    expect(db.permissions.get(`${user.id}:mail:access`)).toBeUndefined();
    expect(db.identitiesByEmail.get("chemvault_mail:researcher@chemvault.science")?.user_id).toBe(user.id);
    expect(db.auditLogs.at(-1)?.action).toBe("mail_account.bind");
  });

  it("rejects a mailbox already bound to another account", async () => {
    const db = new BindingMockD1();
    const first = db.insertUser("first@example.edu", "First");
    const second = db.insertUser("second@example.edu", "Second");
    db.insertMailAccount(first.id, "researcher@chemvault.science");

    await expect(
      bindVerifiedMailAccount({
        env: { DB: db as unknown as D1Database } as Env,
        request: new Request("https://user.chemvault.science/api/user/mail-binding"),
        user: second,
        mail: mailResult(),
      }),
    ).rejects.toThrow("already bound");
  });
});

function mailResult(overrides: Partial<MailPasswordAuthResult> = {}): MailPasswordAuthResult {
  return {
    email: "researcher@chemvault.science",
    name: "Researcher Mail",
    mailUserId: "mail-user-1",
    mailAddress: "researcher@chemvault.science",
    mailRole: "mailbox_user",
    mailStatus: "active",
    canSend: true,
    canReceive: true,
    canLoginMail: true,
    mailboxQuotaMb: 1024,
    aliases: [],
    ...overrides,
  };
}

class BindingMockD1 {
  users = new Map<string, UserRow>();
  mailAccounts = new Map<string, MailAccountRow>();
  identitiesByEmail = new Map<string, ExternalIdentityRow>();
  identitiesByUserId = new Map<string, ExternalIdentityRow>();
  serviceAccess = new Map<string, { id: string; user_id: string; service_key: string; status: string }>();
  permissions = new Map<string, "allow">();
  auditLogs: Array<{ action: string; resource_id: string | null }> = [];

  prepare(sql: string) {
    return new BindingMockStatement(this, sql);
  }

  insertUser(email: string, name: string, options: Partial<UserRow> = {}): UserRow {
    const now = "2026-01-01T00:00:00.000Z";
    const user: UserRow = {
      id: `user_${this.users.size + 1}`,
      email,
      password_hash: "hash",
      name,
      avatar_url: null,
      institution: null,
      field_of_interest: null,
      bio: null,
      website: null,
      role: "free",
      system_role: "user",
      source: "local",
      global_status: "active",
      status: "active",
      created_at: now,
      updated_at: now,
      last_login_at: null,
      ...options,
    };
    this.users.set(user.id, user);
    return user;
  }

  insertMailAccount(userId: string, mailAddress: string): MailAccountRow {
    const row: MailAccountRow = {
      id: `mail_${this.mailAccounts.size + 1}`,
      user_id: userId,
      mail_address: mailAddress,
      mail_display_name: "Mail User",
      mail_role: "mailbox_user",
      mail_status: "active",
      can_send: 1,
      can_receive: 1,
      can_login_mail: 1,
      mailbox_quota_mb: 1024,
      aliases: "[]",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    this.mailAccounts.set(row.id, row);
    return row;
  }
}

class BindingMockStatement {
  private params: unknown[] = [];

  constructor(
    private db: BindingMockD1,
    private sql: string,
  ) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async first<T>() {
    if (this.sql.includes("FROM mail_accounts WHERE user_id")) {
      const [userId] = this.params as [string];
      return ([...this.db.mailAccounts.values()].find((row) => row.user_id === userId && row.mail_status !== "deleted") || null) as T | null;
    }
    if (this.sql.includes("FROM mail_accounts WHERE mail_address")) {
      const [mailAddress] = this.params as [string];
      return ([...this.db.mailAccounts.values()].find((row) => row.mail_address === mailAddress) || null) as T | null;
    }
    if (this.sql.includes("FROM mail_accounts WHERE id")) {
      const [id] = this.params as [string];
      return (this.db.mailAccounts.get(id) || null) as T | null;
    }
    if (this.sql.includes("FROM external_identities") && this.sql.includes("provider_user_id")) {
      const [provider, providerUserId] = this.params as [string, string];
      return (this.db.identitiesByUserId.get(`${provider}:${providerUserId}`) || null) as T | null;
    }
    if (this.sql.includes("FROM external_identities") && this.sql.includes("provider_email")) {
      const [provider, providerEmail] = this.params as [string, string];
      return (this.db.identitiesByEmail.get(`${provider}:${providerEmail}`) || null) as T | null;
    }
    if (this.sql.includes("FROM service_access")) {
      const [userId, serviceKey] = this.params as [string, string];
      return (this.db.serviceAccess.get(`${userId}:${serviceKey}`) || null) as T | null;
    }
    return null;
  }

  async run() {
    if (this.sql.includes("UPDATE users")) {
      const [role, systemRole, updatedAt, id] = this.params as string[];
      const user = this.db.users.get(id);
      if (user) {
        user.role = role as UserRow["role"];
        user.system_role = systemRole as UserRow["system_role"];
        user.updated_at = updatedAt;
      }
    }
    if (this.sql.includes("INSERT OR IGNORE INTO external_identities")) {
      const [id, userId, provider, providerUserId, providerEmail, metadata, createdAt, updatedAt] = this.params as string[];
      const row = {
        id,
        user_id: userId,
        provider,
        provider_user_id: providerUserId || null,
        provider_email: providerEmail,
        credential_hash: null,
        credential_salt: null,
        credential_algorithm: null,
        metadata,
        created_at: createdAt,
        updated_at: updatedAt,
      } satisfies ExternalIdentityRow;
      if (!this.db.identitiesByEmail.has(`${provider}:${providerEmail}`)) {
        this.db.identitiesByEmail.set(`${provider}:${providerEmail}`, row);
      }
      if (providerUserId && !this.db.identitiesByUserId.has(`${provider}:${providerUserId}`)) {
        this.db.identitiesByUserId.set(`${provider}:${providerUserId}`, row);
      }
    }
    if (this.sql.includes("UPDATE external_identities")) {
      const [userId, firstValue, metadata, updatedAt, provider, lookup] = this.params as string[];
      const lookupByUserId = this.sql.includes("WHERE provider = ? AND provider_user_id");
      const row = lookupByUserId
        ? this.db.identitiesByUserId.get(`${provider}:${lookup}`)
        : this.db.identitiesByEmail.get(`${provider}:${lookup}`);
      if (row) {
        row.user_id = userId;
        if (lookupByUserId) row.provider_email = firstValue;
        else if (firstValue) row.provider_user_id = firstValue;
        row.metadata = metadata;
        row.updated_at = updatedAt;
      }
    }
    if (this.sql.includes("INSERT INTO mail_accounts")) {
      const [id, userId, mailAddress, displayName, mailRole, mailStatus, canSend, canReceive, canLoginMail, quota, aliases, createdAt, updatedAt] =
        this.params as [string, string, string, string, MailAccountRow["mail_role"], MailAccountRow["mail_status"], number, number, number, number, string, string, string];
      this.db.mailAccounts.set(id, {
        id,
        user_id: userId,
        mail_address: mailAddress,
        mail_display_name: displayName,
        mail_role: mailRole,
        mail_status: mailStatus,
        can_send: canSend,
        can_receive: canReceive,
        can_login_mail: canLoginMail,
        mailbox_quota_mb: quota,
        aliases,
        created_at: createdAt,
        updated_at: updatedAt,
      });
    }
    if (this.sql.includes("UPDATE mail_accounts")) {
      const [userId, displayName, mailRole, mailStatus, canSend, canReceive, canLoginMail, quota, aliases, updatedAt, id] = this.params as [
        string,
        string,
        MailAccountRow["mail_role"],
        MailAccountRow["mail_status"],
        number,
        number,
        number,
        number,
        string,
        string,
        string,
      ];
      const row = this.db.mailAccounts.get(id);
      if (row) {
        row.user_id = userId;
        row.mail_display_name = displayName;
        row.mail_role = mailRole;
        row.mail_status = mailStatus;
        row.can_send = canSend;
        row.can_receive = canReceive;
        row.can_login_mail = canLoginMail;
        row.mailbox_quota_mb = quota;
        row.aliases = aliases;
        row.updated_at = updatedAt;
      }
    }
    if (this.sql.includes("INSERT INTO service_access")) {
      const [id, userId, status, createdAt, updatedAt] = this.params as string[];
      this.db.serviceAccess.set(`${userId}:chemvault_mail`, { id, user_id: userId, service_key: "chemvault_mail", status });
      void createdAt;
      void updatedAt;
    }
    if (this.sql.includes("UPDATE service_access")) {
      const [status, , id] = this.params as string[];
      const row = [...this.db.serviceAccess.values()].find((entry) => entry.id === id);
      if (row) row.status = status;
    }
    if (this.sql.includes("INSERT OR REPLACE INTO user_permissions")) {
      const [, key, , userId] = this.params as string[];
      this.db.permissions.set(`${userId}:${key}`, "allow");
    }
    if (this.sql.includes("DELETE FROM user_permissions")) {
      const [userId, key] = this.params as string[];
      this.db.permissions.delete(`${userId}:${key}`);
    }
    if (this.sql.includes("INSERT INTO audit_logs")) {
      const [, , , action, , resourceId] = this.params as string[];
      this.db.auditLogs.push({ action, resource_id: resourceId || null });
    }
    return { success: true };
  }
}
