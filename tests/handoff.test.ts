import { describe, expect, it } from "vitest";
import { onRequestGet } from "../functions/api/auth/handoff/start";
import type { Env } from "../functions/_shared/types";

describe("User System handoff", () => {
  it("redirects unauthenticated Lab handoff requests to login and preserves the Lab callback", async () => {
    const labCallback = "https://lab.chemvault.science/auth/callback?next=%2Fhistory";
    const response = await onRequestGet({
      request: new Request(
        `https://user.chemvault.science/api/auth/handoff/start?returnTo=${encodeURIComponent(labCallback)}`,
      ),
      env: { JWT_SECRET: "test-secret" } as Env,
      params: {},
      data: {},
      waitUntil: () => undefined,
      next: async () => new Response(null, { status: 404 }),
      functionPath: "",
      passThroughOnException: () => undefined,
    } as unknown as EventContext<Env, string, Record<string, unknown>>);

    expect(response.status).toBe(302);
    const loginUrl = new URL(response.headers.get("Location") || "");
    expect(loginUrl.origin).toBe("https://user.chemvault.science");
    expect(loginUrl.pathname).toBe("/login");

    const handoffUrl = new URL(loginUrl.searchParams.get("returnTo") || "");
    expect(handoffUrl.origin).toBe("https://user.chemvault.science");
    expect(handoffUrl.pathname).toBe("/api/auth/handoff/start");

    const returnTo = new URL(handoffUrl.searchParams.get("returnTo") || "");
    expect(returnTo.origin).toBe("https://lab.chemvault.science");
    expect(returnTo.pathname).toBe("/auth/callback");
    expect(returnTo.searchParams.get("next")).toBe("/history");
  });
});
