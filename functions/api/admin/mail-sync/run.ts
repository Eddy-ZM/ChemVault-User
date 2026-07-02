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
        todo: "Configure Mail admin record import only after the mail.chemvault.science admin API is available.",
        hasSyncSecret: Boolean(env.MAIL_SYSTEM_SYNC_SECRET),
      },
    });

    return jsonResponse(request, {
      status: "todo",
      message:
        "Automatic mail admin record import is reserved for the future mail.chemvault.science admin API. User Center remains the authority for roles and permissions.",
      requiredEnv: ["MAIL_SYSTEM_SYNC_SECRET"],
    });
  });
