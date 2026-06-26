import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "../functions/_shared/turnstile";
import type { Env } from "../functions/_shared/types";

const request = new Request("https://user.chemvault.science/api/auth/register", {
  headers: { "CF-Connecting-IP": "203.0.113.10" },
});

describe("turnstile verification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips verification for local development when no secret is configured", async () => {
    await expect(verifyTurnstileToken({ env: { NODE_ENV: "development" } as Env, request, token: null })).resolves.toBeUndefined();
  });

  it("fails closed in production when Turnstile is not configured", async () => {
    await expect(verifyTurnstileToken({ env: { NODE_ENV: "production" } as Env, request, token: "token" })).rejects.toThrow(
      "Human verification is not configured.",
    );
  });

  it("requires a token when Turnstile is enabled", async () => {
    await expect(
      verifyTurnstileToken({
        env: { NODE_ENV: "development", TURNSTILE_SECRET_KEY: "secret" } as Env,
        request,
        token: null,
      }),
    ).rejects.toThrow("Complete the Cloudflare verification");
  });

  it("accepts a successful siteverify response for the registration action", async () => {
    const fetchMock = vi.fn(async () => Response.json({ success: true, action: "register_email", hostname: "user.chemvault.science" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      verifyTurnstileToken({
        env: {
          NODE_ENV: "production",
          TURNSTILE_SECRET_KEY: "secret",
          TURNSTILE_EXPECTED_HOSTNAME: "user.chemvault.science",
        } as Env,
        request,
        token: "token",
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects a successful token with the wrong action", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, action: "login", hostname: "user.chemvault.science" })));

    await expect(
      verifyTurnstileToken({
        env: { NODE_ENV: "production", TURNSTILE_SECRET_KEY: "secret" } as Env,
        request,
        token: "token",
      }),
    ).rejects.toThrow("Human verification action did not match");
  });
});
