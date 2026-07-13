import { describe, expect, it } from "vitest";
import {
  requireBillingServiceSecret,
  resolveBillingIdentity,
} from "../functions/_shared/billingIdentity";
import type { Env, UserRow } from "../functions/_shared/types";

function mockEnv(user: Partial<UserRow> | null, secret = "billing-secret"): Env {
  const db = {
    prepare: () => ({
      bind: () => ({
        first: async () => user,
      }),
    }),
  } as unknown as D1Database;
  return { DB: db, BILLING_SERVICE_SECRET: secret };
}

describe("billing identity resolver", () => {
  it("requires the dedicated service secret", () => {
    const env = mockEnv(null);
    const valid = new Request("https://user.example/api/internal/billing/identity", {
      headers: { authorization: "Bearer billing-secret" },
    });
    const invalid = new Request("https://user.example/api/internal/billing/identity", {
      headers: { authorization: "Bearer wrong" },
    });

    expect(() => requireBillingServiceSecret(env, valid)).not.toThrow();
    expect(() => requireBillingServiceSecret(env, invalid)).toThrow("Invalid billing service credential");
    expect(() => requireBillingServiceSecret(mockEnv(null, ""), valid)).toThrow("Invalid billing service credential");
  });

  it("returns only the canonical active user identity", async () => {
    const env = mockEnv({
      id: "usr_123",
      email: "member@example.com",
      status: "active",
      global_status: "active",
    });

    await expect(resolveBillingIdentity(env, " Member@Example.com ")).resolves.toEqual({
      id: "usr_123",
      email: "member@example.com",
    });
  });

  it("rejects invalid, missing, or inactive identities", async () => {
    await expect(resolveBillingIdentity(mockEnv(null), "not-an-email")).rejects.toThrow("valid email");
    await expect(resolveBillingIdentity(mockEnv(null), "missing@example.com")).rejects.toThrow("not found");
    await expect(resolveBillingIdentity(mockEnv({
      id: "usr_disabled",
      email: "disabled@example.com",
      status: "disabled",
      global_status: "disabled",
    }), "disabled@example.com")).rejects.toThrow("not found");
  });
});
