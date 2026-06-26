import { useEffect, useState } from "react";
import { Activity, KeyRound, Mail, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard";
import { ApiClientError, apiRequest } from "../lib/api";
import type { AdminStats } from "../lib/types";

export function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ stats: AdminStats }>("/api/admin/stats")
      .then((body) => setStats(body.stats))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Admin stats failed to load."));
  }, []);

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Admin Console</p>
          <h1>ChemVault identity control plane</h1>
        </div>
      </div>
      {error ? <div className="alert-error">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard icon={UsersRound} label="Total users" value={`${stats?.totalUsers ?? 0}`} />
        <StatCard icon={ShieldCheck} label="Active users" value={`${stats?.activeUsers ?? 0}`} />
        <StatCard icon={KeyRound} label="Admins / Supers" value={`${stats?.adminUsers ?? 0} / ${stats?.superAdminUsers ?? 0}`} />
        <StatCard icon={Mail} label="Mail accounts" value={`${stats?.usersWithMailAccounts ?? 0}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="settings-panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Control areas</h2>
              <p className="text-sm text-slate-500">Manage identity, permission, mail, and service access from the main system.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { to: "/admin/users", title: "User management", text: "Roles, status, details, and quick access to user permissions." },
              { to: "/admin/permissions", title: "Permission center", text: "Global permission definitions grouped by service area." },
              { to: "/admin/mail", title: "Mail accounts", text: "Assign ChemVault mailboxes, aliases, quota, and send/receive flags." },
              { to: "/admin/mail-sync", title: "Mail admin sync", text: "Import mail super/admin users into the main account system." },
            ].map((item) => (
              <Link key={item.to} to={item.to} className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-cyan-300">
                <h3 className="font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.text}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="settings-panel">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-700" />
            <h2 className="text-lg font-semibold text-slate-950">Recent audit logs</h2>
          </div>
          <div className="space-y-3">
            {(stats?.recentAuditLogs || []).length ? (
              stats?.recentAuditLogs.map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="font-medium text-slate-950">{log.action}</div>
                  <div className="mt-1 text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No audit events yet.</p>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-900">
            Mail sync:{" "}
            {stats?.mailAdminSyncStatus?.lastSyncedAt
              ? `last run ${new Date(stats.mailAdminSyncStatus.lastSyncedAt).toLocaleString()}`
              : "not run yet"}
          </div>
        </div>
      </div>
    </section>
  );
}
