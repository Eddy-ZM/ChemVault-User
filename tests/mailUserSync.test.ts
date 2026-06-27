import { describe, expect, it } from "vitest";
import {
  parseMailUserSyncPayload,
  requireMailSyncSecret,
  systemRoleForMailRole,
} from "../functions/_shared/mailUserSync";
import type { Env } from "../functions/_shared/types";

describe("mail user sync", () => {
  it("normalizes ordinary mail users without granting admin roles", () => {
    const payload = parseMailUserSyncPayload({
      email: " New.User@ChemVault.Science ",
      mailAddress: " New.User@ChemVault.Science ",
      displayName: "New User",
      aliases: [" n.user@chemvault.science ", "not-an-email"],
    });

    expect(payload).toMatchObject({
      primaryEmail: "new.user@chemvault.science",
      mailAddress: "new.user@chemvault.science",
      displayName: "New User",
      mailRole: "mailbox_user",
      mailStatus: "active",
      canSend: true,
      canReceive: true,
      canLoginMail: true,
      aliases: ["n.user@chemvault.science"],
    });
    expect(systemRoleForMailRole(payload.mailRole)).toBe("user");
  });

  it("maps mail admin roles to main system authority", () => {
    expect(systemRoleForMailRole("mailbox_admin")).toBe("admin");
    expect(systemRoleForMailRole("mailbox_super")).toBe("super_admin");
  });

  it("requires the configured mail sync secret", async () => {
    const env = { MAIL_SYSTEM_SYNC_SECRET: "shared-secret" } as Env;
    const okRequest = new Request("https://user.chemvault.science/api/integrations/mail/users/sync", {
      method: "POST",
      headers: { "x-chemvault-sync-secret": "shared-secret" },
    });
    await expect(requireMailSyncSecret(env, okRequest)).resolves.toBeUndefined();

    const badRequest = new Request("https://user.chemvault.science/api/integrations/mail/users/sync", {
      method: "POST",
      headers: { "x-chemvault-sync-secret": "wrong-secret" },
    });
    await expect(requireMailSyncSecret(env, badRequest)).rejects.toThrow("invalid");
  });

  it("accepts the existing mail SSO secret as a deployment fallback", async () => {
    const env = { MAIL_SYSTEM_SSO_SECRET: "sso-secret" } as Env;
    const request = new Request("https://user.chemvault.science/api/integrations/mail/users/sync", {
      method: "POST",
      headers: { authorization: "Bearer sso-secret" },
    });

    await expect(requireMailSyncSecret(env, request)).resolves.toBeUndefined();
  });
});
