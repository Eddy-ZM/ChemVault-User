import { describe, expect, it } from "vitest";
import { getPermissionDisplay } from "../src/lib/permissionDisplay";

describe("permission display", () => {
  it("presents the UoM mail gate as Access restriction with explicit allow and deny outcomes", () => {
    const display = getPermissionDisplay({
      id: "perm_uom_mail_access",
      key: "service:uom-su-mail-system:access",
      name: "Access restriction",
      description: "Deny restricts the principal workspace and all archive operations. Allow grants full service access. Public pages remain available in either state.",
      category: "service",
      createdAt: "2026-07-19T00:00:00.000Z",
    });

    expect(display.title).toBe("Access restriction");
    expect(display.summary).toContain("Deny restricts the principal workspace and all archive operations");
    expect(display.summary).toContain("Allow grants full service access");
    expect(display.summary).toContain("Public pages remain available in either state");
  });
});
