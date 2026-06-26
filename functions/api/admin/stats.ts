import { requireAdmin } from "../../_shared/permissions";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    const stats = await env.DB.prepare(
      `SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN status = 'active' AND COALESCE(global_status, status, 'active') = 'active' THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN role = 'pro' THEN 1 ELSE 0 END) AS pro_users,
        SUM(CASE WHEN COALESCE(system_role, 'user') = 'admin' THEN 1 ELSE 0 END) AS admin_users,
        SUM(CASE WHEN COALESCE(system_role, 'user') = 'super_admin' THEN 1 ELSE 0 END) AS super_admin_users,
        SUM(CASE WHEN COALESCE(system_role, 'user') = 'owner' THEN 1 ELSE 0 END) AS owner_users
       FROM users
       WHERE status != 'deleted'`,
    ).first<{
      total_users: number;
      active_users: number;
      pro_users: number;
      admin_users: number;
      super_admin_users: number;
      owner_users: number;
    }>();

    const storage = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS storage_usage_mb
       FROM usage_logs
       WHERE service = 'files' AND action = 'storage_mb'`,
    ).first<{ storage_usage_mb: number }>();

    const mailAccounts = await env.DB.prepare(
      `SELECT COUNT(*) AS users_with_mail_accounts FROM mail_accounts WHERE mail_status != 'deleted'`,
    ).first<{ users_with_mail_accounts: number }>();

    const enabledServices = await env.DB.prepare(
      `SELECT COUNT(*) AS enabled_services_count FROM service_access WHERE status = 'active'`,
    ).first<{ enabled_services_count: number }>();

    const auditRows = await env.DB.prepare(
      `SELECT id, actor_user_id, target_user_id, action, resource_type, resource_id, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 10`,
    ).all<{
      id: string;
      actor_user_id: string | null;
      target_user_id: string | null;
      action: string;
      resource_type: string | null;
      resource_id: string | null;
      details: string | null;
      created_at: string;
    }>();

    const syncStatus = await env.DB.prepare(
      `SELECT created_at, details
       FROM admin_sync_logs
       WHERE source LIKE 'mail_system%'
       ORDER BY created_at DESC
       LIMIT 1`,
    ).first<{ created_at: string; details: string | null }>();

    return jsonResponse(request, {
      stats: {
        totalUsers: Number(stats?.total_users || 0),
        activeUsers: Number(stats?.active_users || 0),
        proUsers: Number(stats?.pro_users || 0),
        adminUsers: Number(stats?.admin_users || 0),
        superAdminUsers: Number(stats?.super_admin_users || 0),
        ownerUsers: Number(stats?.owner_users || 0),
        usersWithMailAccounts: Number(mailAccounts?.users_with_mail_accounts || 0),
        enabledServicesCount: Number(enabledServices?.enabled_services_count || 0),
        storageUsageMb: Number(storage?.storage_usage_mb || 0),
        recentAuditLogs: (auditRows.results || []).map((row) => ({
          id: row.id,
          actorUserId: row.actor_user_id,
          targetUserId: row.target_user_id,
          action: row.action,
          resourceType: row.resource_type,
          resourceId: row.resource_id,
          details: row.details ? JSON.parse(row.details) : null,
          createdAt: row.created_at,
        })),
        mailAdminSyncStatus: syncStatus
          ? { lastSyncedAt: syncStatus.created_at, details: syncStatus.details ? JSON.parse(syncStatus.details) : null }
          : null,
      },
    });
  });
