import { describe, expect, it } from "vitest";
import { verifyAccountPassword } from "../functions/_shared/passwordAuth";
import { hashPassword } from "../functions/_shared/security";
import type { Env, UserRow } from "../functions/_shared/types";

const baseUser: UserRow = {
  id: "user_1",
  email: "main@example.com",
  password_hash: "placeholder",
  name: "User",
  avatar_url: null,
  institution: null,
  field_of_interest: null,
  bio: null,
  website: null,
  role: "free",
  system_role: "user",
  source: "mail_system",
  global_status: "active",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null,
};

describe("account password verification", () => {
  it("accepts a local User Center password before external checks", async () => {
    const user = { ...baseUser, password_hash: await hashPassword("local-password") };
    const env = { DB: failingDb() } as Env;

    await expect(verifyAccountPassword(env, user, "local-password")).resolves.toBe(true);
  });

  it("falls back to the linked ChemVault Mail account password", async () => {
    const user = { ...baseUser, password_hash: await hashPassword("other-password") };
    const env = {
      DB: mailAccountDb("zikun.wang@chemvault.science"),
      MAIL_SYSTEM_SSO_SECRET: "shared-secret",
      MAIL_SYSTEM_SSO_URL: "https://mail.chemvault.science/api/sso/chemvault-user/authorize",
    } as Env;
    const calls: string[] = [];
    const fetcher = async (url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}")) as { email?: string };
      calls.push(body.email || "");
      if (body.email !== "zikun.wang@chemvault.science") {
        return new Response(JSON.stringify({ code: 401, message: "Invalid email or password." }), { status: 401 });
      }
      return new Response(
        JSON.stringify({
          code: 200,
          data: {
            email: "zikun.wang@chemvault.science",
            name: "zikun.wang",
            mailUserId: "14",
            mailRole: "mailbox_super",
            mailStatus: "active",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    await expect(verifyAccountPassword(env, user, "mail-password", fetcher)).resolves.toBe(true);
    expect(calls).toEqual(["main@example.com", "zikun.wang@chemvault.science"]);
  });
});

function failingDb(): D1Database {
  return {
    prepare() {
      throw new Error("DB should not be used for local password success.");
    },
  } as unknown as D1Database;
}

function mailAccountDb(mailAddress: string): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind() {
          return {
            async first() {
              if (sql.includes("FROM external_identities")) return null;
              if (sql.includes("FROM mail_accounts")) {
                return {
                  id: "mail_1",
                  user_id: "user_1",
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
              }
              return null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
}
