import { describe, expect, it } from "vitest";
import { getPermissionDependency, getPermissionDisplay } from "../src/lib/permissionDisplay";

describe("permission display", () => {
  it("keeps UoM service entry separate from full feature access", () => {
    const entryPermission = {
      id: "perm_uom_mail_entry",
      key: "service:uom-su-mail-system:access",
      name: "University of Manchester Student Representative Mail System",
      description: "Allows the user to access the University of Manchester Student Representative Mail System and create official Student Representative announcements.",
      category: "service",
      createdAt: "2026-07-19T00:00:00.000Z",
    };
    const contentPermission = {
      id: "perm_uom_mail_full_access",
      key: "feature:uom-su-mail-system:full_access",
      name: "Full service access",
      description: "Available by default after service entry is allowed. Deny blocks the principal workspace and archive operations; Allow restores full service access.",
      category: "feature",
      createdAt: "2026-07-19T00:00:00.000Z",
    };

    const entryDisplay = getPermissionDisplay(entryPermission);
    const contentDisplay = getPermissionDisplay(contentPermission);

    expect(entryDisplay.title).toBe("Access University of Manchester Student Representative Mail System");
    expect(entryDisplay.title).not.toBe("Full service access");
    expect(contentDisplay.title).toBe("Full service access");
    expect(contentDisplay.summary).toContain("Available by default after service entry is allowed");
    expect(contentDisplay.summary).toContain("Deny blocks the principal workspace and archive operations");
    expect(contentDisplay.summary).toContain("Allow restores full service access");
    expect(getPermissionDependency(contentPermission)).toEqual({
      serviceKey: "uom-su-mail-system",
      permissionKey: "service:uom-su-mail-system:access",
      label: "University of Manchester Student Representative Mail System",
    });
  });
});
