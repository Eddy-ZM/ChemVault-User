import { requireUser } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env, UserRole } from "../../_shared/types";

const planLimits: Record<UserRole, { aiCredits: number; storageMb: number; apiRequests: number }> = {
  free: { aiCredits: 100, storageMb: 512, apiRequests: 1000 },
  pro: { aiCredits: 2500, storageMb: 10240, apiRequests: 50000 },
  admin: { aiCredits: 100000, storageMb: 102400, apiRequests: 1000000 },
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const rows = await env.DB.prepare(
      `SELECT service, action, COALESCE(SUM(amount), 0) AS total
       FROM usage_logs
       WHERE user_id = ? AND created_at >= ?
       GROUP BY service, action`,
    )
      .bind(user.id, monthStart.toISOString())
      .all<{ service: string; action: string; total: number }>();

    let aiExtractionCreditsUsed = 0;
    let storageUsedMb = 0;
    let apiRequestsThisMonth = 0;

    for (const row of rows.results || []) {
      if (row.service === "extract") aiExtractionCreditsUsed += Number(row.total || 0);
      if (row.service === "files" && row.action === "storage_mb") storageUsedMb += Number(row.total || 0);
      if (row.action === "api_request") apiRequestsThisMonth += Number(row.total || 0);
    }

    return jsonResponse(request, {
      summary: {
        aiExtractionCreditsUsed,
        storageUsedMb,
        apiRequestsThisMonth,
      },
      limits: planLimits[user.role],
    });
  });
