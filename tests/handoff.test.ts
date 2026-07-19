import { describe, expect, it } from "vitest";
import { onRequestGet } from "../functions/api/auth/handoff/start";
import { onRequestGet as verifyHandoff } from "../functions/api/auth/handoff/verify";
import {
  createUserSystemHandoffToken,
  getUserSystemHandoffAudienceForReturnTo,
  uomMailSystemAudience,
  uomMailSystemFullAccessPermission,
  uomMailSystemPermission,
  verifyUserSystemHandoffToken,
} from "../functions/_shared/handoff";
import type { Env, UserRow } from "../functions/_shared/types";

const user: UserRow = {
  id: "user_1",
  email: "student@example.com",
  password_hash: "hash",
  name: "Student Representative",
  avatar_url: null,
  institution: "The University of Manchester",
  field_of_interest: null,
  bio: null,
  website: null,
  role: "free",
  system_role: "user",
  source: "local",
  global_status: "active",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null,
};

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

  it("redirects unauthenticated UoM Mail System handoff requests to login and preserves the editor destination", async () => {
    const editor = "https://uom-su-mail-system.pages.dev/?draft=chemistry-update";
    const response = await onRequestGet(createEventContext(
      { JWT_SECRET: "test-secret" } as Env,
      new Request(`https://user.chemvault.science/api/auth/handoff/start?returnTo=${encodeURIComponent(editor)}`),
    ));

    expect(response.status).toBe(302);
    const loginUrl = new URL(response.headers.get("Location") || "");
    const handoffUrl = new URL(loginUrl.searchParams.get("returnTo") || "");
    expect(handoffUrl.searchParams.get("returnTo")).toBe(editor);
  });

  it("maps only approved destinations to their handoff audience", () => {
    expect(getUserSystemHandoffAudienceForReturnTo("https://lab.chemvault.science/auth/callback")).toBe("chemvault-lab");
    expect(getUserSystemHandoffAudienceForReturnTo("https://mailsys.uomsu.chemvault.science/")).toBe(uomMailSystemAudience);
    expect(getUserSystemHandoffAudienceForReturnTo("https://uom-su-mail-system.pages.dev/")).toBe(uomMailSystemAudience);
    expect(getUserSystemHandoffAudienceForReturnTo("https://preview.uom-su-mail-system.pages.dev/editor")).toBe(uomMailSystemAudience);
    expect(() => getUserSystemHandoffAudienceForReturnTo("https://example.com/")).toThrow("Unsupported User System handoff destination");
  });

  it("issues eight-hour UoM tokens without changing the five-minute Lab lifetime", async () => {
    const env = { JWT_SECRET: "test-secret" } as Env;
    const lab = await verifyUserSystemHandoffToken(env, await createUserSystemHandoffToken(env, user), "chemvault-lab");
    const uom = await verifyUserSystemHandoffToken(
      env,
      await createUserSystemHandoffToken(env, user, uomMailSystemAudience),
      uomMailSystemAudience,
    );

    expect(lab.exp - lab.iat).toBe(5 * 60);
    expect(uom.exp - uom.iat).toBe(8 * 60 * 60);
    await expect(verifyUserSystemHandoffToken(env, await createUserSystemHandoffToken(env, user), uomMailSystemAudience)).rejects.toThrow(
      "Invalid User System handoff claims",
    );
  });

  it("returns independent live decisions for both UoM permissions and rejects other pairs", async () => {
    for (const permissionKey of [uomMailSystemPermission, uomMailSystemFullAccessPermission]) {
      const env = {
        JWT_SECRET: "test-secret",
        DB: createHandoffDb("allow", user, permissionKey),
      } as unknown as Env;
      const token = await createUserSystemHandoffToken(env, user, uomMailSystemAudience);
      const request = new Request(
        `https://user.chemvault.science/api/auth/handoff/verify?audience=${uomMailSystemAudience}&permission=${encodeURIComponent(permissionKey)}`,
        { headers: { authorization: `Bearer ${token}`, origin: "https://mailsys.uomsu.chemvault.science" } },
      );
      const response = await verifyHandoff(createEventContext(env, request));
      const body = await response.json() as { handoff: { audience: string }; access: { allowed: boolean; reason: string }; user: { permissions: string[] } };

      expect(response.status).toBe(200);
      expect(body.handoff.audience).toBe(uomMailSystemAudience);
      expect(body.access).toEqual({ allowed: true, reason: "allowed_by_user_permission" });
      expect(body.user.permissions).toContain(permissionKey);
    }

    const env = { JWT_SECRET: "test-secret", DB: createHandoffDb(null) } as unknown as Env;
    const token = await createUserSystemHandoffToken(env, user, uomMailSystemAudience);
    const invalidResponse = await verifyHandoff(createEventContext(env, new Request(
      `https://user.chemvault.science/api/auth/handoff/verify?audience=${uomMailSystemAudience}&permission=service:another:access`,
      { headers: { authorization: `Bearer ${token}` } },
    )));
    expect(invalidResponse.status).toBe(400);
  });

  it("re-evaluates independent UoM denies on every verification request", async () => {
    for (const permissionKey of [uomMailSystemPermission, uomMailSystemFullAccessPermission]) {
      const env = {
        JWT_SECRET: "test-secret",
        DB: createHandoffDb("deny", user, permissionKey),
      } as unknown as Env;
      const token = await createUserSystemHandoffToken(env, user, uomMailSystemAudience);
      const response = await verifyHandoff(createEventContext(env, new Request(
        `https://user.chemvault.science/api/auth/handoff/verify?audience=${uomMailSystemAudience}&permission=${encodeURIComponent(permissionKey)}`,
        { headers: { authorization: `Bearer ${token}` } },
      )));
      const body = await response.json() as { access: { allowed: boolean; reason: string } };

      expect(body.access).toEqual({ allowed: false, reason: "denied_by_user_permission" });
    }
  });

  it("applies explicit-only and approved-account bootstrap rules through the live UoM verification endpoint", async () => {
    const owner = { ...user, email: "owner@example.com", system_role: "owner" as const };
    const ownerEnv = {
      JWT_SECRET: "test-secret",
      DB: createHandoffDb(null, owner),
    } as unknown as Env;
    const ownerToken = await createUserSystemHandoffToken(ownerEnv, owner, uomMailSystemAudience);
    const ownerResponse = await verifyHandoff(createEventContext(ownerEnv, new Request(
      `https://user.chemvault.science/api/auth/handoff/verify?audience=${uomMailSystemAudience}&permission=${encodeURIComponent(uomMailSystemPermission)}`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
    )));
    const ownerBody = await ownerResponse.json() as { access: { allowed: boolean; reason: string }; user: { permissions: string[] } };

    expect(ownerBody.access).toEqual({ allowed: false, reason: "missing_permission" });
    expect(ownerBody.user.permissions).not.toContain(uomMailSystemPermission);

    for (const email of ["ziwen.mu@chemvault.science", "test@chemvault.science"]) {
      const approvedUser = { ...user, email };
      const approvedEnv = {
        JWT_SECRET: "test-secret",
        DB: createHandoffDb(null, approvedUser),
      } as unknown as Env;
      const approvedToken = await createUserSystemHandoffToken(approvedEnv, approvedUser, uomMailSystemAudience);
      const approvedResponse = await verifyHandoff(createEventContext(approvedEnv, new Request(
        `https://user.chemvault.science/api/auth/handoff/verify?audience=${uomMailSystemAudience}&permission=${encodeURIComponent(uomMailSystemPermission)}`,
        { headers: { authorization: `Bearer ${approvedToken}` } },
      )));
      const approvedBody = await approvedResponse.json() as { access: { allowed: boolean; reason: string }; user: { permissions: string[] } };

      expect(approvedBody.access).toEqual({ allowed: true, reason: "allowed_by_bootstrap_identity" });
      expect(approvedBody.user.permissions).toContain(uomMailSystemPermission);
    }
  });

  it("keeps the Lab verification response compatible when no permission is requested", async () => {
    const env = {
      JWT_SECRET: "test-secret",
      DB: createHandoffDb("allow"),
    } as unknown as Env;
    const token = await createUserSystemHandoffToken(env, user, "chemvault-lab");
    const response = await verifyHandoff(createEventContext(env, new Request(
      "https://user.chemvault.science/api/auth/handoff/verify",
      { headers: { authorization: `Bearer ${token}` } },
    )));
    const body = await response.json() as { handoff: { audience: string }; access?: unknown };

    expect(response.status).toBe(200);
    expect(body.handoff.audience).toBe("chemvault-lab");
    expect(body).not.toHaveProperty("access");
  });
});

function createEventContext(env: Env, request: Request) {
  return {
    request,
    env,
    params: {},
    data: {},
    waitUntil: () => undefined,
    next: async () => new Response(null, { status: 404 }),
    functionPath: "",
    passThroughOnException: () => undefined,
  } as unknown as EventContext<Env, string, Record<string, unknown>>;
}

function createHandoffDb(
  effect: "allow" | "deny" | null,
  dbUser: UserRow = user,
  permissionKey: string = uomMailSystemPermission,
): D1Database {
  return {
    prepare(query: string) {
      const statement = {
        bind() {
          return statement;
        },
        async first() {
          if (query.includes("FROM users")) return dbUser;
          if (query.includes("FROM mail_accounts")) return null;
          return null;
        },
        async all() {
          if (query.includes("FROM user_permissions")) {
            return { results: effect ? [{ key: permissionKey, effect }] : [] };
          }
          return { results: [] };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
}
