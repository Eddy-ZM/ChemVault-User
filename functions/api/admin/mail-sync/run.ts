import { requireAdmin, writeAuditLog } from "../../../_shared/permissions";
import { handleApi, jsonResponse } from "../../../_shared/responses";
import type { Env } from "../../../_shared/types";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      action: "mail_admin_sync.run_requested",
      resourceType: "mail_admin_sync",
      details: {
        todo: "Configure MAIL_SYSTEM_SYNC_SECRET and mail.chemvault.science admin API before enabling automatic sync.",
        hasSyncSecret: Boolean(env.MAIL_SYSTEM_SYNC_SECRET),
      },
    });

    return jsonResponse(request, {
      status: "todo",
      message:
        "Automatic mail admin sync is reserved for the future mail.chemvault.science admin API. Use /api/admin/mail-sync/manual for now.",
      requiredEnv: ["MAIL_SYSTEM_SYNC_SECRET"],
    });
  });
