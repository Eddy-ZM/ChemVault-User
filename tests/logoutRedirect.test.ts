import { describe, expect, it } from "vitest";
import { onRequestGet } from "../functions/api/auth/logout/redirect";

describe("browser logout redirect", () => {
  it("clears the session cookie and returns to an approved mail-system URL", async () => {
    const request = new Request(
      "https://user.chemvault.science/api/auth/logout/redirect?returnTo=https%3A%2F%2Fmailsys.uomsu.chemvault.science%2F",
    );
    const response = await onRequestGet({ env: {}, request } as never) as Response;

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://mailsys.uomsu.chemvault.science/");
    expect(response.headers.get("set-cookie")).toMatch(/^chemvault_session=; Max-Age=0; Path=\//);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects an external return target", async () => {
    const request = new Request(
      "https://user.chemvault.science/api/auth/logout/redirect?returnTo=https%3A%2F%2Fevil.example%2F",
    );
    const response = await onRequestGet({ env: {}, request } as never) as Response;
    expect(response.headers.get("location")).toBe("/login");
  });
});
