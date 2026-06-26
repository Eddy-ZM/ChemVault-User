import { useEffect, useState } from "react";
import { Activity, ChevronDown, KeyRound, Mail, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard";
import { ApiClientError, apiRequest } from "../lib/api";
import type { AdminStats } from "../lib/types";
import { LoadingBlock } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";

export function AdminPanel() {
  const { notify } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState("");
  const [error, setError] = useState("");

  async function load(showToast = false) {
    try {
      setLoading(true);
      const body = await apiRequest<{ stats: AdminStats }>("/api/admin/stats");
      setStats(body.stats);
      setError("");
      if (showToast) notify({ title: "Admin dashboard refreshed", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Admin stats failed to load.";
      setError(message);
      notify({ title: "Admin stats failed to load", description: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Admin Console</p>
          <h1>ChemVault identity control plane</h1>
        </div>
        <button className="secondary-button" type="button" onClick={() => void load(true)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
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
          {loading ? <LoadingBlock label="Loading audit events..." /> : <div className="space-y-3">
            {(stats?.recentAuditLogs || []).length ? (
              stats?.recentAuditLogs.map((log) => (
                <button key={log.id} className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm transition hover:border-cyan-200 hover:bg-cyan-50" type="button" onClick={() => setExpandedLogId((current) => current === log.id ? "" : log.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{log.action}</div>
                      <div className="mt-1 text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition ${expandedLogId === log.id ? "rotate-180" : ""}`} />
                  </div>
                  {expandedLogId === log.id ? (
                    <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-50">
                      {JSON.stringify(log.details || { resourceType: log.resourceType, resourceId: log.resourceId }, null, 2)}
                    </pre>
                  ) : null}
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">No audit events yet.</p>
            )}
          </div>}
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
