import { describe, expect, it } from "vitest";
import { corsHeaders } from "../functions/_shared/cors";

describe("CORS policy", () => {
  it("allows the UoM Student Representative Mail System to use authenticated User System APIs", () => {
    for (const origin of [
      "https://mailsys.uomsu.chemvault.science",
      "https://uom-su-mail-system.pages.dev",
      "https://preview.uom-su-mail-system.pages.dev",
    ]) {
      const headers = corsHeaders(new Request("https://user.chemvault.science/api/access/check", {
        headers: { origin },
      }));

      expect(headers.get("Access-Control-Allow-Origin")).toBe(origin);
      expect(headers.get("Access-Control-Allow-Credentials")).toBe("true");
    }
  });

  it("does not allow unregistered origins", () => {
    const headers = corsHeaders(new Request("https://user.chemvault.science/api/access/check", {
      headers: { origin: "https://example.com" },
    }));

    expect(headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(headers.has("Access-Control-Allow-Credentials")).toBe(false);
  });
});
