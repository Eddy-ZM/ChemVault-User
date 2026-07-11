import { describe, expect, it } from "vitest";
import { assertUserCanAuthenticate, isUserActive } from "../functions/_shared/userStatus";

describe("user authentication status", () => {
  it("allows authentication only when both status dimensions are active", () => {
    expect(isUserActive({ status: "active", global_status: "active" })).toBe(true);
    for (const status of ["suspended", "deletion_pending", "disabled", "deleted"] as const) {
      expect(isUserActive({ status, global_status: "active" })).toBe(false);
      expect(isUserActive({ status: "active", global_status: status })).toBe(false);
    }
  });

  it("blocks deletion-pending password and SSO authentication with a stable error", () => {
    expect(() => assertUserCanAuthenticate({ status: "deletion_pending", global_status: "deletion_pending" }))
      .toThrowError(/being deleted/i);
  });

  it("keeps deleted and disabled accounts blocked", () => {
    expect(() => assertUserCanAuthenticate({ status: "deleted", global_status: "deleted" })).toThrowError(/deleted/i);
    expect(() => assertUserCanAuthenticate({ status: "disabled", global_status: "disabled" })).toThrowError(/not active/i);
  });
});
