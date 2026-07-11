import { afterEach, describe, expect, it, vi } from "vitest";
import { callLifecycleServices, getLifecycleServiceConfigs } from "../functions/_shared/lifecycle";
import type { Env } from "../functions/_shared/types";

afterEach(() => vi.restoreAllMocks());

describe("distributed user lifecycle", () => {
  it("defaults to every data-bearing service and reports missing endpoints", async () => {
    const services = getLifecycleServiceConfigs({ LAB_LIFECYCLE_URL: "https://lab.example/internal/" } as Env);
    expect(services.map((service) => service.name)).toEqual(["files", "lab", "notifications", "mail", "extract"]);
    expect(services.find((service) => service.name === "lab")?.url).toBe("https://lab.example/internal");
  });

  it("sends a dedicated secret and returns service payloads", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, records: 2 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const results = await callLifecycleServices({
      services: [{ name: "lab", url: "https://lab.example/api/internal/lifecycle" }],
      secret: "lifecycle-only-secret",
      action: "export",
      userId: "user/1",
      email: "user@example.com",
      requestId: "job_1",
    });

    expect(results).toEqual([
      { service: "lab", status: "completed", httpStatus: 200, data: { ok: true, records: 2 } },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://lab.example/api/internal/lifecycle/user%2F1",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer lifecycle-only-secret" }),
      }),
    );
  });

  it("fails closed when a required endpoint is unavailable", async () => {
    const results = await callLifecycleServices({
      services: [{ name: "files" }],
      secret: "secret",
      action: "delete",
      userId: "user_1",
      email: "user@example.com",
      requestId: "job_2",
    });

    expect(results).toEqual([
      { service: "files", status: "failed", error: "Service lifecycle URL is not configured." },
    ]);
  });
});
