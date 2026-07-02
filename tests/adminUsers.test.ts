import { describe, expect, it } from "vitest";
import { assertActorCanCreateSystemRole, parseAdminCreateUserPayload } from "../functions/_shared/adminUsers";
import type { UserRow } from "../functions/_shared/types";

const adminUser: UserRow = {
  id: "admin_1",
  email: "admin@example.com",
  password_hash: "hash",
  name: "Admin",
  avatar_url: null,
  institution: null,
  field_of_interest: null,
  bio: null,
  website: null,
  role: "admin",
  system_role: "admin",
  source: "local",
  global_status: "active",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null,
};

describe("admin user creation payloads", () => {
  it("normalizes a manual user with an assigned mailbox", () => {
    const payload = parseAdminCreateUserPayload({
      name: "  New User  ",
      email: " New.User@Example.EDU ",
      password: "temporary-password",
      institution: "ChemVault Lab",
      fieldOfInterest: "Materials",
      role: "pro",
      systemRole: "staff",
      assignMailbox: true,
      mailAccount: {
        mailAddress: " New.User@ChemVault.Science ",
        displayName: "New User",
        mailboxQuotaMb: 2048,
        aliases: [" n.user@chemvault.science ", "not-an-email"],
      },
    });

    expect(payload).toMatchObject({
      name: "New User",
      email: "new.user@example.edu",
      password: "temporary-password",
      role: "pro",
      systemRole: "staff",
      assignMailbox: true,
      mailAccount: {
        mailAddress: "new.user@chemvault.science",
        aliases: ["n.user@chemvault.science"],
        mailboxQuotaMb: 2048,
      },
    });
  });

  it("allows SSO-only account creation without a temporary password", () => {
    const payload = parseAdminCreateUserPayload({
      name: "SSO User",
      email: "sso@example.edu",
      assignMailbox: false,
    });

    expect(payload.password).toBeNull();
    expect(payload.role).toBe("free");
    expect(payload.systemRole).toBe("user");
    expect(payload.mailAccount).toBeNull();
  });

  it("rejects weak temporary passwords and deleted initial status", () => {
    expect(() =>
      parseAdminCreateUserPayload({
        name: "Weak",
        email: "weak@example.edu",
        password: "short",
      }),
    ).toThrow("Password must be at least 8 characters");

    expect(() =>
      parseAdminCreateUserPayload({
        name: "Deleted",
        email: "deleted@example.edu",
        status: "deleted",
      }),
    ).toThrow("New users cannot be created as deleted");
  });

  it("blocks normal admins from creating super admin or owner accounts", () => {
    expect(() => assertActorCanCreateSystemRole(adminUser, "super_admin")).toThrow("Only super admin or owner");
    expect(() => assertActorCanCreateSystemRole(adminUser, "owner")).toThrow("Only owner");
    expect(() => assertActorCanCreateSystemRole(adminUser, "admin")).not.toThrow();
  });

  it("allows super admins to create super admins but not owners", () => {
    const superAdmin = { ...adminUser, system_role: "super_admin" as const };

    expect(() => assertActorCanCreateSystemRole(superAdmin, "super_admin")).not.toThrow();
    expect(() => assertActorCanCreateSystemRole(superAdmin, "owner")).toThrow("Only owner");
  });
});
