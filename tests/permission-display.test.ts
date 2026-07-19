import { describe, expect, it } from "vitest";
import { getPermissionDependency, getPermissionDisplay } from "../src/lib/permissionDisplay";

describe("permission display", () => {
  it("keeps UoM service entry separate from the content restriction", () => {
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
      name: "Access restriction",
      description: "Deny restricts the principal workspace and all archive operations. Allow grants full service access. Public pages remain available in either state.",
      category: "feature",
      createdAt: "2026-07-19T00:00:00.000Z",
    };

    const entryDisplay = getPermissionDisplay(entryPermission);
    const contentDisplay = getPermissionDisplay(contentPermission);

    expect(entryDisplay.title).toBe("Access University of Manchester Student Representative Mail System");
    expect(entryDisplay.title).not.toBe("Access restriction");
    expect(contentDisplay.title).toBe("Access restriction");
    expect(contentDisplay.summary).toContain("Deny restricts the principal workspace and all archive operations");
    expect(contentDisplay.summary).toContain("Allow grants full service access");
    expect(contentDisplay.summary).toContain("Public pages remain available in either state");
    expect(getPermissionDependency(contentPermission)).toEqual({
      serviceKey: "uom-su-mail-system",
      permissionKey: "service:uom-su-mail-system:access",
      label: "University of Manchester Student Representative Mail System",
    });
  });
});
