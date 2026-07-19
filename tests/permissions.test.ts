import { describe, expect, it } from "vitest";
import {
  assertActorCanManageTarget,
  canAccessPage,
  canAccessService,
  evaluateAccessCheck,
  evaluatePermission,
  loadEffectivePermissionKeys,
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
    const entryPermission = "service:uom-su-mail-system:access";
    const contentPermission = "feature:uom-su-mail-system:full_access";
    const entryDefinition = permissionSeeds.find((permission) => permission.key === entryPermission);
    const contentDefinition = permissionSeeds.find((permission) => permission.key === contentPermission);

    expect(entryDefinition).toMatchObject({
      key: entryPermission,
      name: "University of Manchester Student Representative Mail System",
      description: "Allows the user to access the University of Manchester Student Representative Mail System and create official Student Representative announcements.",
      category: "service",
    });
    expect(contentDefinition).toMatchObject({
      key: contentPermission,
      name: "Access restriction",
      description: "Deny restricts the principal workspace and all archive operations. Allow grants full service access. Public pages remain available in either state.",
      category: "feature",
    });
    for (const permissions of Object.values(defaultRolePermissions)) {
      expect(permissions).not.toContain(entryPermission);
      expect(permissions).not.toContain(contentPermission);
    }
    expect(canAccessService(baseUser, snapshot(), "uom-su-mail-system")).toEqual({
      allowed: false,
      reason: "missing_permission",
    });
    expect(
      canAccessService(
        baseUser,
        snapshot({ userPermissions: [{ key: entryPermission, effect: "allow" }] }),
        "uom-su-mail-system",
      ),
    ).toEqual({ allowed: true, reason: "allowed_by_user_permission" });
    expect(
      canAccessService(
        baseUser,
        snapshot({ userPermissions: [{ key: entryPermission, effect: "deny" }] }),
        "uom-su-mail-system",
      ),
    ).toEqual({ allowed: false, reason: "denied_by_user_permission" });
    expect(
      evaluatePermission(
        baseUser,
        snapshot({ userPermissions: [{ key: entryPermission, effect: "allow" }] }),
        contentPermission,
      ),
    ).toEqual({ allowed: false, reason: "missing_permission" });
    expect(
      evaluatePermission(
        baseUser,
        snapshot({ userPermissions: [{ key: contentPermission, effect: "allow" }] }),
        contentPermission,
      ),
    ).toEqual({ allowed: true, reason: "allowed_by_user_permission" });
  });

  it("keeps UoM Mail System access explicit-only for non-bootstrap owner and super-admin users", () => {
    const permissionKeys = [
      "service:uom-su-mail-system:access",
      "feature:uom-su-mail-system:full_access",
    ];

    for (const systemRole of ["owner", "super_admin"] as const) {
      const privilegedUser = { ...baseUser, email: `${systemRole}@example.com`, system_role: systemRole };
      for (const permissionKey of permissionKeys) {
        expect(evaluatePermission(privilegedUser, snapshot(), permissionKey)).toEqual({
          allowed: false,
          reason: "missing_permission",
        });
        expect(
          evaluatePermission(
            privilegedUser,
            snapshot({ rolePermissions: [{ key: permissionKey, effect: "allow" }] }),
            permissionKey,
          ),
        ).toEqual({ allowed: false, reason: "missing_permission" });
        expect(
          evaluatePermission(
            privilegedUser,
            snapshot({
              rolePermissions: [{ key: permissionKey, effect: "deny" }],
              userPermissions: [{ key: permissionKey, effect: "allow" }],
            }),
            permissionKey,
          ),
        ).toEqual({ allowed: true, reason: "allowed_by_user_permission" });
      }
      expect(
        canAccessService(
          privilegedUser,
          snapshot({ services: [{ key: "uom-su-mail-system", status: "active" }] }),
          "uom-su-mail-system",
        ),
      ).toEqual({ allowed: false, reason: "missing_permission" });
    }
  });

  it("bootstraps only the approved ChemVault accounts for UoM Mail System access and lets an explicit deny win", () => {
    const permissionKeys = [
      "service:uom-su-mail-system:access",
      "feature:uom-su-mail-system:full_access",
    ];
    for (const email of ["  Ziwen.Mu@ChemVault.Science ", " TEST@CHEMVAULT.SCIENCE "]) {
      const approvedUser = { ...baseUser, email, system_role: "user" as const };
      for (const permissionKey of permissionKeys) {
        expect(evaluatePermission(approvedUser, snapshot(), permissionKey)).toEqual({
          allowed: true,
          reason: "allowed_by_bootstrap_identity",
        });
        expect(
          evaluatePermission(
            approvedUser,
            snapshot({ rolePermissions: [{ key: permissionKey, effect: "deny" }] }),
            permissionKey,
          ),
        ).toEqual({ allowed: true, reason: "allowed_by_bootstrap_identity" });
        expect(
          evaluatePermission(
            approvedUser,
            snapshot({ userPermissions: [{ key: permissionKey, effect: "deny" }] }),
            permissionKey,
          ),
        ).toEqual({ allowed: false, reason: "denied_by_user_permission" });
      }
    }
  });

  it("returns an effective UoM permission only for bootstrap or explicit user access", async () => {
    const permissionKeys = [
      "service:uom-su-mail-system:access",
      "feature:uom-su-mail-system:full_access",
    ];
    const allDefinitions = [...permissionKeys, "admin:system_settings:edit"];

    for (const systemRole of ["owner", "super_admin"] as const) {
      const effective = await loadEffectivePermissionKeys(
        permissionDb({ definitions: allDefinitions }),
        { ...baseUser, email: `${systemRole}@example.com`, system_role: systemRole },
      );
      expect(effective).toContain("admin:system_settings:edit");
      for (const permissionKey of permissionKeys) expect(effective).not.toContain(permissionKey);

      for (const permissionKey of permissionKeys) {
        const explicitlyAllowed = await loadEffectivePermissionKeys(
          permissionDb({
            definitions: allDefinitions,
            userPermissions: [{ key: permissionKey, effect: "allow" }],
          }),
          { ...baseUser, email: `${systemRole}@example.com`, system_role: systemRole },
        );
        expect(explicitlyAllowed).toContain(permissionKey);
      }
    }

    for (const email of ["ziwen.mu@chemvault.science", "test@chemvault.science"]) {
      const effective = await loadEffectivePermissionKeys(
        permissionDb({ definitions: allDefinitions }),
        { ...baseUser, email },
      );
      for (const permissionKey of permissionKeys) expect(effective).toContain(permissionKey);
    }
    for (const permissionKey of permissionKeys) {
      await expect(
        loadEffectivePermissionKeys(
          permissionDb({
            definitions: allDefinitions,
            userPermissions: [{ key: permissionKey, effect: "deny" }],
          }),
          { ...baseUser, email: "ziwen.mu@chemvault.science" },
        ),
      ).resolves.not.toContain(permissionKey);
    }
  });
});

function permissionDb(input: {
  definitions?: string[];
  rolePermissions?: AccessSnapshot["rolePermissions"];
  userPermissions?: AccessSnapshot["userPermissions"];
}): D1Database {
  return {
    prepare(query: string) {
      const statement = {
        bind() {
          return statement;
        },
        async all() {
          if (query.includes("FROM permissions ORDER BY key")) {
            return { results: (input.definitions || []).map((key) => ({ key })) };
          }
          if (query.includes("FROM role_permissions")) return { results: input.rolePermissions || [] };
          if (query.includes("FROM user_permissions")) return { results: input.userPermissions || [] };
          return { results: [] };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
}
