import { describe, expect, it } from "vitest";
import { buildAppleAuthorizeRedirect, buildAppleClientOptions, hasAppleSsoConfig } from "../functions/_shared/appleAuth";
import { signMailSsoAssertion, verifyMailPassword, verifyMailSsoAssertion } from "../functions/_shared/externalAuth";
import type { Env } from "../functions/_shared/types";

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
});
