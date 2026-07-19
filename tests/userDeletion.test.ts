import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDistributedLifecycleAction } from "../functions/_shared/lifecycle";
import { writeAuditLog } from "../functions/_shared/permissions";
import { permanentlyDeleteUser } from "../functions/_shared/userDeletion";
import type { Env, UserRow } from "../functions/_shared/types";

vi.mock("../functions/_shared/lifecycle", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../functions/_shared/lifecycle")>();
  return {
    ...actual,
    runDistributedLifecycleAction: vi.fn(),
  };
});

vi.mock("../functions/_shared/permissions", () => ({
  writeAuditLog: vi.fn(),
}));

const targetUser: UserRow = {
  id: "user_test",
  email: "test@chemvault.science",
  password_hash: "hash",
  name: "test",
  avatar_url: null,
  institution: null,
  field_of_interest: null,
  bio: null,
  website: null,
  role: "admin",
  system_role: "admin",
  source: "admin_created",
  global_status: "deletion_pending",
  status: "deletion_pending",
  created_at: "2026-07-19T00:00:00.000Z",
  updated_at: "2026-07-19T00:00:00.000Z",
  last_login_at: null,
};

function createEnv() {
  const statements: Array<{ sql: string; args: unknown[] }> = [];
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (...args: unknown[]) => {
        statements.push({ sql, args });
        return {
          run: vi.fn(async () => ({ success: true })),
        };
      },
    })),
    batch: vi.fn(async () => []),
  };

  return {
    env: { DB: db as unknown as D1Database } as Env,
    db,
    statements,
  };
}

function mockFailedLifecycle() {
  vi.mocked(runDistributedLifecycleAction).mockResolvedValue({
    id: "job_failed",
    action: "delete",
    status: "failed",
    results: [{ service: "files", status: "failed", error: "Service lifecycle URL is not configured." }],
  });
}

describe("permanentlyDeleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFailedLifecycle();
  });

  it("keeps the local user pending when lifecycle deletion fails without force", async () => {
    const { env, statements } = createEnv();

    const result = await permanentlyDeleteUser({
      env,
      request: new Request("https://user.chemvault.science/api/admin/users/user_test"),
      target: targetUser,
      actorUserId: "admin_user",
      action: "admin_delete",
    });

    expect(result.lifecycleJob.status).toBe("failed");
    expect(result.forcedLocalDeletion).toBe(false);
    expect(statements.some((statement) => statement.sql.includes("DELETE FROM users"))).toBe(false);
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "user.delete.pending" }));
  });

  it("removes a deletion-pending local user when admin force local deletion is requested", async () => {
    const { env, statements } = createEnv();

    const result = await permanentlyDeleteUser({
      env,
      request: new Request("https://user.chemvault.science/api/admin/users/user_test"),
      target: targetUser,
      actorUserId: "admin_user",
      action: "admin_delete",
      forceLocal: true,
    });

    expect(result.lifecycleJob.status).toBe("failed");
    expect(result.forcedLocalDeletion).toBe(true);
    expect(statements.some((statement) => statement.sql.includes("DELETE FROM users"))).toBe(true);
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "user.delete.admin.force_local",
      details: expect.objectContaining({ deletionMode: "local_hard_delete_after_lifecycle_failure" }),
    }));
  });
});
