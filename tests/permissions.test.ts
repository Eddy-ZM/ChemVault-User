import { describe, expect, it } from "vitest";
import {
  assertActorCanManageTarget,
  canAccessPage,
  canAccessService,
  evaluateAccessCheck,
  evaluatePermission,
  makeAuditDetails,
} from "../functions/_shared/permissions";
import { defaultRolePermissions, permissionSeeds } from "../functions/_shared/permissionCatalog";
import type { AccessSnapshot, UserRow } from "../functions/_shared/types";
import { buildDeletedUserRecord } from "../functions/_shared/userDeletion";

const baseUser: UserRow = {
  id: "user_1",
  email: "user@example.com",
  password_hash: "hash",
  name: "User",
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
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null,
};

function snapshot(overrides: Partial<AccessSnapshot> = {}): AccessSnapshot {
  return {
    rolePermissions: [],
    userPermissions: [],
    services: [],
    pages: [],
    ...overrides,
  };
}

describe("permission evaluation", () => {
  it("gives super_admin and owner all permissions", () => {
    expect(evaluatePermission({ ...baseUser, system_role: "super_admin" }, snapshot(), "admin:system_settings:edit")).toEqual({
      allowed: true,
      reason: "allowed_by_super_admin",
    });
    expect(evaluatePermission({ ...baseUser, system_role: "owner" }, snapshot(), "anything:anywhere")).toEqual({
      allowed: true,
      reason: "allowed_by_owner",
    });
  });

  it("does not authorize Mail runtime rights from User Center permissions", () => {
    const grants = snapshot({
      services: [{ key: "chemvault_mail", status: "active" }],
      userPermissions: [
        { key: "mail:send", effect: "allow" },
        { key: "service:chemvault_mail:access", effect: "allow" },
      ],
    });

    expect(evaluatePermission({ ...baseUser, system_role: "owner" }, grants, "mail:send")).toEqual({
      allowed: false,
      reason: "missing_permission",
    });
    expect(canAccessService({ ...baseUser, system_role: "super_admin" }, grants, "chemvault_mail")).toEqual({
      allowed: false,
      reason: "missing_permission",
    });
  });

  it("makes explicit deny override role and user allow", () => {
    const result = evaluatePermission(
      baseUser,
      snapshot({
        rolePermissions: [{ key: "page:file:view", effect: "allow" }],
        userPermissions: [
          { key: "page:file:view", effect: "allow" },
          { key: "page:file:view", effect: "deny" },
        ],
      }),
      "page:file:view",
    );

    expect(result).toEqual({ allowed: false, reason: "denied_by_user_permission" });
  });

  it("blocks disabled and deleted users regardless of grants", () => {
    const grants = snapshot({ userPermissions: [{ key: "page:file:view", effect: "allow" }] });

    expect(evaluatePermission({ ...baseUser, status: "disabled" }, grants, "page:file:view")).toEqual({
      allowed: false,
      reason: "user_inactive",
    });
    expect(evaluatePermission({ ...baseUser, global_status: "deleted" }, grants, "page:file:view")).toEqual({
      allowed: false,
      reason: "user_inactive",
    });
  });

  it("evaluates page and service access state", () => {
    expect(
      evaluateAccessCheck(
        baseUser,
        snapshot({
          services: [{ key: "chemvault_file", status: "active" }],
          pages: [{ key: "file", status: "active" }],
        }),
        { service: "chemvault_file", page: "file" },
      ),
    ).toMatchObject({ allowed: true, reason: "allowed_by_page_access" });

    expect(
      evaluateAccessCheck(
        baseUser,
        snapshot({
          services: [{ key: "chemvault_file", status: "disabled" }],
          pages: [{ key: "file", status: "active" }],
        }),
        { service: "chemvault_file", page: "file" },
      ),
    ).toMatchObject({ allowed: false, reason: "service_disabled" });
  });

  it("denies and allows file page access from permissions", () => {
    expect(canAccessPage(baseUser, snapshot(), "file")).toEqual({
      allowed: false,
      reason: "missing_permission",
    });

    expect(
      canAccessPage(
        baseUser,
        snapshot({ userPermissions: [{ key: "page:file:view", effect: "allow" }] }),
        "file",
      ),
    ).toEqual({ allowed: true, reason: "allowed_by_user_permission" });
  });

  it("allows service access from direct service grants", () => {
    expect(
      canAccessService(
        baseUser,
        snapshot({ services: [{ key: "chemvault_file", status: "active" }] }),
        "chemvault_file",
      ),
    ).toEqual({ allowed: true, reason: "allowed_by_service_access" });

    expect(
      evaluateAccessCheck(
        baseUser,
        snapshot({ services: [{ key: "chemvault_file", status: "active" }] }),
        { service: "chemvault_file" },
      ),
    ).toEqual({ allowed: true, reason: "allowed_by_service_access" });
  });

  it("lets admin role permissions unlock admin actions", () => {
    expect(
      evaluatePermission(
        { ...baseUser, role: "admin", system_role: "admin" },
        snapshot({ rolePermissions: [{ key: "admin:users:view", effect: "allow" }] }),
        "admin:users:view",
      ),
    ).toEqual({ allowed: true, reason: "allowed_by_role_permission" });
  });

  it("prevents normal admins from modifying protected roles", () => {
    expect(() =>
      assertActorCanManageTarget({
        actor: { ...baseUser, id: "admin_1", role: "admin", system_role: "admin" },
        target: { ...baseUser, id: "super_1", system_role: "super_admin" },
        action: "update_role",
      }),
    ).toThrow("Super admin or owner access is required");

    expect(() =>
      assertActorCanManageTarget({
        actor: { ...baseUser, id: "admin_1", role: "admin", system_role: "admin" },
        target: { ...baseUser, id: "admin_1", role: "admin", system_role: "admin" },
        action: "update_role",
        nextSystemRole: "owner",
      }),
    ).toThrow("Only owner accounts can grant owner access");
  });

  it("does not give mail-system source special downgrade protection", () => {
    expect(() =>
      assertActorCanManageTarget({
        actor: { ...baseUser, id: "super_1", role: "admin", system_role: "super_admin" },
        target: { ...baseUser, id: "mail_super_1", role: "admin", system_role: "super_admin", source: "mail_system" },
        action: "update_role",
        nextSystemRole: "admin",
      }),
    ).not.toThrow();
  });

  it("builds audit details without leaking secrets", () => {
    const details = makeAuditDetails({
      password: "secret",
      token_hash: "hidden",
      role: "admin",
    });

    expect(details).toBe(JSON.stringify({ role: "admin" }));
  });

  it("builds a compact deleted-user record without password data", () => {
    const record = buildDeletedUserRecord({ ...baseUser, password_hash: "secret-password-hash", source: "apple" });

    expect(record).toEqual({
      id: "user_1",
      email: "user@example.com",
      name: "User",
      role: "free",
      systemRole: "user",
      source: "apple",
      status: "active",
      globalStatus: "active",
    });
    expect(JSON.stringify(record)).not.toContain("secret-password-hash");
  });

  it("defines main-site admin permissions for Forms and Leads", () => {
    const keys = new Set(permissionSeeds.map((permission) => permission.key));

    for (const key of [
      "service:chemvault_main_admin:access",
      "page:main_admin_forms:view",
      "page:main_admin_leads:view",
      "main_admin:access",
      "main_admin:forms:read",
      "main_admin:forms:write",
      "main_admin:forms:reply",
      "main_admin:leads:read",
      "main_admin:leads:write",
      "main_admin:leads:notify",
    ]) {
      expect(keys.has(key)).toBe(true);
      expect(defaultRolePermissions.admin).toContain(key);
    }

    expect(defaultRolePermissions.admin).toContain("service:chemvault_main_admin:access");
  });

  it("defines and evaluates the UoM Student Representative Mail System access permission", () => {
    const permissionKey = "service:uom-su-mail-system:access";
    const definition = permissionSeeds.find((permission) => permission.key === permissionKey);

    expect(definition).toMatchObject({
      key: permissionKey,
      category: "service",
    });
    expect(defaultRolePermissions.user).not.toContain(permissionKey);
    expect(canAccessService(baseUser, snapshot(), "uom-su-mail-system")).toEqual({
      allowed: false,
      reason: "missing_permission",
    });
    expect(
      canAccessService(
        baseUser,
        snapshot({ userPermissions: [{ key: permissionKey, effect: "allow" }] }),
        "uom-su-mail-system",
      ),
    ).toEqual({ allowed: true, reason: "allowed_by_user_permission" });
    expect(
      canAccessService(
        baseUser,
        snapshot({ userPermissions: [{ key: permissionKey, effect: "deny" }] }),
        "uom-su-mail-system",
      ),
    ).toEqual({ allowed: false, reason: "denied_by_user_permission" });
  });
});
