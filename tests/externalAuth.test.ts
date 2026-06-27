import { describe, expect, it } from "vitest";
import { buildAppleAuthorizeRedirect, buildAppleClientOptions, hasAppleSsoConfig } from "../functions/_shared/appleAuth";
import { signMailSsoAssertion, verifyMailPassword, verifyMailSsoAssertion } from "../functions/_shared/externalAuth";
import {
  buildOAuthAuthorizationUrl,
  normalizeGoogleProfileForTest,
  normalizeMicrosoftProfileForTest,
  selectGitHubVerifiedEmail,
  signOAuthStateForTest,
  linkOAuthIdentityToUserForTest,
  upsertOAuthUserForTest,
  verifyOAuthStateForTest,
  type ProviderProfile,
} from "../functions/_shared/oauthAuth";
import type { Env, UserRow } from "../functions/_shared/types";

describe("external mail auth", () => {
  it("verifies the mail system SHA-256 salt-prefix password format", async () => {
    const salt = "FSJ9RKov9b8or4PJDRNaKw==";
    const password = "example-password";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}${password}`));
    const storedHash = btoa(String.fromCharCode(...new Uint8Array(digest)));

    await expect(verifyMailPassword(password, salt, storedHash)).resolves.toBe(true);
    await expect(verifyMailPassword("wrong-password", salt, storedHash)).resolves.toBe(false);
  });

  it("accepts a valid mail SSO assertion and rejects a tampered one", async () => {
    const env = { MAIL_SYSTEM_SYNC_SECRET: "test-secret" } as Env;
    const iat = String(Date.now());
    const assertion = {
      email: "User@ChemVault.Science",
      name: "Mail User",
      mailUserId: "42",
      iat,
      nonce: "nonce-123",
      signature: await signMailSsoAssertion("test-secret", {
        email: "user@chemvault.science",
        name: "Mail User",
        mailUserId: "42",
        iat,
        nonce: "nonce-123",
      }),
    };

    await expect(verifyMailSsoAssertion(env, assertion)).resolves.toMatchObject({
      email: "user@chemvault.science",
      name: "Mail User",
      mailUserId: "42",
    });

    await expect(verifyMailSsoAssertion(env, { ...assertion, name: "Tampered" })).rejects.toThrow("Mail SSO signature is invalid.");
  });

  it("redirects Apple SSO start back to login when Apple credentials are not configured", async () => {
    const env = {} as Env;
    expect(hasAppleSsoConfig(env)).toBe(false);

    const response = await buildAppleAuthorizeRedirect({
      env,
      request: new Request("https://user.chemvault.science/api/auth/sso/apple/start?returnTo=/dashboard"),
      returnTo: "/dashboard",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://user.chemvault.science/login?sso=apple_not_configured");
  });

  it("builds Apple popup options without exposing server credentials", async () => {
    const env = {
      JWT_SECRET: "test-jwt-secret",
      APPLE_CLIENT_ID: "com.science.chemvault.user",
      APPLE_TEAM_ID: "TEAM123",
      APPLE_KEY_ID: "KEY123",
      APPLE_PRIVATE_KEY: "private-key",
      APPLE_REDIRECT_URI: "https://user.chemvault.science/api/auth/sso/apple/callback",
    } as Env;

    const options = await buildAppleClientOptions({
      env,
      request: new Request("https://user.chemvault.science/api/auth/sso/apple/options?returnTo=/dashboard"),
      returnTo: "/dashboard",
    });

    expect(options).toMatchObject({
      clientId: "com.science.chemvault.user",
      redirectUri: "https://user.chemvault.science/api/auth/sso/apple/callback",
      scope: "name email",
      usePopup: true,
    });
    expect(options.state).toContain(".");
    expect(JSON.stringify(options)).not.toContain("private-key");
  });

  it("builds OAuth authorization URLs with Apple-style callback paths", async () => {
    const env = {
      AUTH_URL: "https://user.chemvault.science",
      GOOGLE_CLIENT_ID: "google-client",
      MICROSOFT_CLIENT_ID: "microsoft-client",
      GITHUB_CLIENT_ID: "github-client",
    } as Env;
    const request = new Request("https://user.chemvault.science/api/auth/sso/google/start");

    expect(
      buildOAuthAuthorizationUrl({
        env,
        request,
        provider: "google",
        state: "state",
        nonce: "nonce",
      }).searchParams.get("redirect_uri"),
    ).toBe("https://user.chemvault.science/api/auth/sso/google/callback");
    expect(
      buildOAuthAuthorizationUrl({
        env,
        request,
        provider: "microsoft",
        state: "state",
        nonce: "nonce",
      }).searchParams.get("redirect_uri"),
    ).toBe("https://user.chemvault.science/api/auth/sso/microsoft/callback");
    expect(
      buildOAuthAuthorizationUrl({
        env,
        request,
        provider: "github",
        state: "state",
        nonce: "nonce",
      }).searchParams.get("redirect_uri"),
    ).toBe("https://user.chemvault.science/api/auth/sso/github/callback");
  });

  it("signs OAuth state and rejects tampered state", async () => {
    const env = { AUTH_SECRET: "oauth-state-secret", JWT_SECRET: "jwt-fallback" } as Env;
    const state = await signOAuthStateForTest(env, {
      provider: "google",
      returnTo: "/dashboard",
      nonce: "nonce-123",
      mode: "login",
    });

    await expect(verifyOAuthStateForTest(env, state)).resolves.toMatchObject({
      provider: "google",
      returnTo: "/dashboard",
      nonce: "nonce-123",
      mode: "login",
    });
    await expect(verifyOAuthStateForTest(env, `${state}tampered`)).rejects.toThrow("Invalid OAuth state.");
  });

  it("normalizes Google OIDC profile without granting admin defaults", () => {
    const profile = normalizeGoogleProfileForTest({
      sub: "google-123",
      email: "Researcher@Example.edu",
      email_verified: true,
      name: "Researcher",
      picture: "https://example.edu/avatar.png",
    });

    expect(profile).toMatchObject({
      provider: "google",
      providerAccountId: "google-123",
      email: "researcher@example.edu",
      name: "Researcher",
      avatarUrl: "https://example.edu/avatar.png",
      emailVerified: true,
    });
  });

  it("normalizes Microsoft OIDC profile from common tenant claims", () => {
    const profile = normalizeMicrosoftProfileForTest({
      oid: "microsoft-123",
      preferred_username: "Scientist@Example.edu",
      name: "Microsoft Scientist",
      tid: "tenant-1",
    });

    expect(profile).toMatchObject({
      provider: "microsoft",
      providerAccountId: "microsoft-123",
      email: "scientist@example.edu",
      name: "Microsoft Scientist",
      emailVerified: true,
    });
  });

  it("uses GitHub verified primary email when profile email is private", () => {
    expect(
      selectGitHubVerifiedEmail(null, [
        { email: "secondary@example.edu", primary: false, verified: true },
        { email: "primary@example.edu", primary: true, verified: true },
      ]),
    ).toBe("primary@example.edu");
  });

  it("accepts GitHub public email only when the email API confirms it is verified", () => {
    expect(
      selectGitHubVerifiedEmail("public@example.edu", [
        { email: "public@example.edu", primary: false, verified: true },
        { email: "other@example.edu", primary: false, verified: true },
      ]),
    ).toBe("public@example.edu");
  });

  it("does not accept unverified GitHub emails", () => {
    expect(selectGitHubVerifiedEmail(null, [{ email: "unverified@example.edu", primary: true, verified: false }])).toBe("");
  });

  it("creates Google OAuth users with free/user defaults", async () => {
    const db = new MockD1Database();
    const user = await upsertOAuthUserForTest(mockEnv(db), oauthProfile("google", "google-1", "new@example.edu"));

    expect(user).toMatchObject({
      email: "new@example.edu",
      role: "free",
      system_role: "user",
      source: "google",
      status: "active",
      global_status: "active",
    });
    expect(db.identities.get("google:google-1")?.user_id).toBe(user.id);
  });

  it("binds Google OAuth login to an existing email without changing admin role", async () => {
    const db = new MockD1Database();
    const existing = db.insertUser("existing@example.edu", "Existing Admin", {
      role: "admin",
      system_role: "admin",
      source: "local",
    });

    const user = await upsertOAuthUserForTest(mockEnv(db), oauthProfile("google", "google-2", "existing@example.edu"));

    expect(user.id).toBe(existing.id);
    expect(user.role).toBe("admin");
    expect(user.system_role).toBe("admin");
    expect(db.identities.get("google:google-2")?.user_id).toBe(existing.id);
  });

  it("creates Microsoft OAuth users without admin privileges", async () => {
    const db = new MockD1Database();
    const user = await upsertOAuthUserForTest(mockEnv(db), oauthProfile("microsoft", "ms-1", "microsoft@example.edu"));

    expect(user.source).toBe("microsoft");
    expect(user.role).toBe("free");
    expect(user.system_role).toBe("user");
  });

  it("creates GitHub OAuth users without admin privileges", async () => {
    const db = new MockD1Database();
    const user = await upsertOAuthUserForTest(mockEnv(db), oauthProfile("github", "gh-1", "github@example.edu"));

    expect(user.source).toBe("github");
    expect(user.role).toBe("free");
    expect(user.system_role).toBe("user");
  });

  it("blocks linking a provider account already linked to another user", async () => {
    const db = new MockD1Database();
    const first = db.insertUser("first@example.edu", "First");
    const second = db.insertUser("second@example.edu", "Second");
    await upsertOAuthUserForTest(mockEnv(db), oauthProfile("github", "gh-conflict", first.email));

    await expect(
      linkOAuthIdentityToUserForTest(mockEnv(db), second.id, oauthProfile("github", "gh-conflict", second.email)),
    ).rejects.toThrow("already linked to another ChemVault account");
  });
});

function oauthProfile(provider: ProviderProfile["provider"], providerAccountId: string, email: string): ProviderProfile {
  return {
    provider,
    providerAccountId,
    email,
    name: `${provider} User`,
    avatarUrl: null,
    emailVerified: true,
    metadata: {},
  };
}

function mockEnv(db: MockD1Database): Env {
  return {
    DB: db as unknown as D1Database,
    JWT_SECRET: "test-secret",
  } as Env;
}

type UserInsertOptions = Partial<Pick<UserRow, "role" | "system_role" | "source" | "global_status" | "status">>;

class MockD1Database {
  users = new Map<string, UserRow>();
  identities = new Map<
    string,
    { id: string; user_id: string; provider: string; provider_user_id: string; provider_email: string; metadata: string | null }
  >();

  prepare(sql: string) {
    return new MockD1Statement(this, sql);
  }

  async batch(statements: MockD1Statement[]) {
    await Promise.all(statements.map((statement) => statement.run()));
    return [];
  }

  insertUser(email: string, name: string, options: UserInsertOptions = {}): UserRow {
    const now = new Date().toISOString();
    const user: UserRow = {
      id: `user_${this.users.size + 1}`,
      email,
      password_hash: "pbkdf2$sha256$100000$salt$hash",
      name,
      avatar_url: null,
      institution: null,
      field_of_interest: null,
      bio: null,
      website: null,
      role: options.role || "free",
      system_role: options.system_role || "user",
      source: options.source || "local",
      global_status: options.global_status || "active",
      status: options.status || "active",
      created_at: now,
      updated_at: now,
      last_login_at: null,
    };
    this.users.set(user.id, user);
    return user;
  }
}

class MockD1Statement {
  private params: unknown[] = [];

  constructor(
    private db: MockD1Database,
    private sql: string,
  ) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async first<T>() {
    const sql = this.sql;
    if (sql.includes("FROM external_identities") && sql.includes("provider_user_id")) {
      const [provider, providerUserId] = this.params as [string, string];
      return (this.db.identities.get(`${provider}:${providerUserId}`) || null) as T | null;
    }
    if (sql.includes("FROM external_identities") && sql.includes("provider_email")) {
      const [provider, email] = this.params as [string, string];
      return (
        [...this.db.identities.values()].find((identity) => identity.provider === provider && identity.provider_email === email) || null
      ) as T | null;
    }
    if (sql.includes("FROM users WHERE email")) {
      const [email] = this.params as [string];
      return ([...this.db.users.values()].find((user) => user.email === email) || null) as T | null;
    }
    if (sql.includes("FROM users WHERE id")) {
      const [id] = this.params as [string];
      return (this.db.users.get(id) || null) as T | null;
    }
    return null;
  }

  async run() {
    const sql = this.sql;
    if (sql.includes("INSERT INTO users")) {
      const [id, email, passwordHash, name, avatarUrl, source, createdAt, updatedAt] = this.params as string[];
      this.db.users.set(id, {
        id,
        email,
        password_hash: passwordHash,
        name,
        avatar_url: avatarUrl || null,
        institution: null,
        field_of_interest: null,
        bio: null,
        website: null,
        role: "free",
        system_role: "user",
        source,
        global_status: "active",
        status: "active",
        created_at: createdAt,
        updated_at: updatedAt,
        last_login_at: null,
      } as UserRow);
    }
    if (sql.includes("UPDATE users")) {
      const [name, avatarUrl, updatedAt, id] = this.params as string[];
      const user = this.db.users.get(id);
      if (user) {
        user.name = user.name === user.email || user.name === "" ? name : user.name;
        user.avatar_url = user.avatar_url || avatarUrl || null;
        user.updated_at = updatedAt;
      }
    }
    if (sql.includes("INSERT OR IGNORE INTO external_identities")) {
      const [id, userId, provider, providerUserId, providerEmail, metadata] = this.params as string[];
      const key = `${provider}:${providerUserId}`;
      if (!this.db.identities.has(key)) {
        this.db.identities.set(key, {
          id,
          user_id: userId,
          provider,
          provider_user_id: providerUserId,
          provider_email: providerEmail,
          metadata,
        });
      }
    }
    if (sql.includes("UPDATE external_identities")) {
      const [userId, providerEmail, metadata, , provider, providerUserId] = this.params as string[];
      const identity = this.db.identities.get(`${provider}:${providerUserId}`);
      if (identity) {
        identity.user_id = userId;
        identity.provider_email = providerEmail;
        identity.metadata = metadata;
      }
    }
    return { success: true };
  }
}
