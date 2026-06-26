import { describe, expect, it } from "vitest";
import { createSessionJwt, hashPassword, sha256Hex, verifyPassword, verifySessionJwt } from "../functions/_shared/security";

describe("security helpers", () => {
  it("hashes passwords with a salt and verifies without storing plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).not.toContain("correct horse battery staple");
    expect(hash.startsWith("pbkdf2$")).toBe(true);
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("creates signed session JWTs that can be hash-stored and rejects tampering", async () => {
    const token = await createSessionJwt({
      secret: "unit-test-secret",
      sessionId: "session-1",
      userId: "user-1",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });

    expect(await sha256Hex(token)).toMatch(/^[a-f0-9]{64}$/);
    await expect(verifySessionJwt(token, "unit-test-secret")).resolves.toMatchObject({
      sid: "session-1",
      sub: "user-1",
    });
    await expect(verifySessionJwt(`${token}x`, "unit-test-secret")).resolves.toBeNull();
  });
});
