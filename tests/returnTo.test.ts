import { describe, expect, it } from "vitest";
import { getSafeReturnTo } from "../src/lib/returnTo";

describe("returnTo validation", () => {
  it("allows internal paths and ChemVault production HTTPS URLs", () => {
    expect(getSafeReturnTo("/dashboard")).toBe("/dashboard");
    expect(getSafeReturnTo("https://app.chemvault.science/documents")).toBe(
      "https://app.chemvault.science/documents",
    );
  });

  it("allows localhost development URLs", () => {
    expect(getSafeReturnTo("http://localhost:3000/dashboard")).toBe("http://localhost:3000/dashboard");
    expect(getSafeReturnTo("http://127.0.0.1:3000/dashboard")).toBe("http://127.0.0.1:3000/dashboard");
  });

  it("rejects protocol-relative, non-HTTPS production, and external URLs", () => {
    expect(getSafeReturnTo("//evil.example/dashboard")).toBe("/dashboard");
    expect(getSafeReturnTo("http://app.chemvault.science/dashboard")).toBe("/dashboard");
    expect(getSafeReturnTo("https://evil.example/dashboard")).toBe("/dashboard");
  });
});
