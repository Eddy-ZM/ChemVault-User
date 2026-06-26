import { describe, expect, it } from "vitest";
import { normalizeEmail, validatePasswordStrength, validateRegisterPayload } from "../functions/_shared/validators";

describe("validators", () => {
  it("normalizes emails before storing or comparing them", () => {
    expect(normalizeEmail("  Lab.User@Example.EDU ")).toBe("lab.user@example.edu");
  });

  it("requires passwords to be at least eight characters", () => {
    expect(validatePasswordStrength("short")).toEqual({
      ok: false,
      message: "Password must be at least 8 characters.",
    });
    expect(validatePasswordStrength("long-enough")).toEqual({ ok: true });
  });

  it("validates required registration fields on the server side", () => {
    const result = validateRegisterPayload({
      name: "Ada Chemist",
      email: "ada@example.edu",
      password: "valid-pass",
      institution: "ChemVault University",
      fieldOfInterest: "Chemistry",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("ada@example.edu");
      expect(result.value.fieldOfInterest).toBe("Chemistry");
    }
  });
});
