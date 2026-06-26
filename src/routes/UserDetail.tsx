import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { AuditLog, MailAccount, PageAccess, PermissionGrant, ServiceAccess, User } from "../lib/types";

interface UserDetailResponse {
  user: User;
  mailAccount: MailAccount | null;
  permissions: PermissionGrant[];
  rolePermissions: PermissionGrant[];
  services: ServiceAccess[];
  pages: PageAccess[];
  usage: { aiExtractionCreditsUsed: number; storageUsedMb: number; apiRequestsThisMonth: number };
  auditLogs: AuditLog[];
}

export function UserDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    apiRequest<UserDetailResponse>(`/api/admin/users/${id}`)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "User detail failed to load."));
  }, [id]);

  if (error) return <section className="page-section"><div className="alert-error">{error}</div></section>;
  if (!detail) return <section className="page-section"><div className="settings-panel">Loading user detail...</div></section>;

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">User Detail</p>
          <h1>{detail.user.name}</h1>
          <p className="text-sm text-slate-500">{detail.user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="secondary-button" to={`/admin/users/${detail.user.id}/permissions`}>Permissions</Link>
          <Link className="secondary-button" to={`/admin/users/${detail.user.id}/services`}>Services</Link>
          <Link className="secondary-button" to={`/admin/users/${detail.user.id}/pages`}>Pages</Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="settings-panel">
          <h2 className="text-lg font-semibold text-slate-950">Identity</h2>
          <dl className="detail-list">
            <dt>Account role</dt><dd>{detail.user.role}</dd>
            <dt>System role</dt><dd>{detail.user.systemRole}</dd>
            <dt>Status</dt><dd>{detail.user.globalStatus}</dd>
            <dt>Source</dt><dd>{detail.user.source}</dd>
            <dt>Institution</dt><dd>{detail.user.institution || "-"}</dd>
            <dt>Joined</dt><dd>{new Date(detail.user.createdAt).toLocaleDateString()}</dd>
          </dl>
        </div>

        <div className="settings-panel">
          <h2 className="text-lg font-semibold text-slate-950">Mail account</h2>
          {detail.mailAccount ? (
            <dl className="detail-list">
              <dt>Address</dt><dd>{detail.mailAccount.mailAddress}</dd>
              <dt>Role</dt><dd>{detail.mailAccount.mailRole}</dd>
              <dt>Status</dt><dd>{detail.mailAccount.mailStatus}</dd>
              <dt>Quota</dt><dd>{detail.mailAccount.mailboxQuotaMb} MB</dd>
              <dt>Aliases</dt><dd>{detail.mailAccount.aliases.join(", ") || "-"}</dd>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No ChemVault mailbox assigned.</p>
          )}
        </div>

        <div className="settings-panel">
          <h2 className="text-lg font-semibold text-slate-950">Usage</h2>
          <dl className="detail-list">
            <dt>AI extraction</dt><dd>{detail.usage.aiExtractionCreditsUsed}</dd>
            <dt>Storage</dt><dd>{detail.usage.storageUsedMb} MB</dd>
            <dt>API requests</dt><dd>{detail.usage.apiRequestsThisMonth}</dd>
          </dl>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryList title="Direct permissions" items={detail.permissions.map((item) => `${item.key} (${item.effect})`)} />
        <SummaryList title="Service access" items={detail.services.map((item) => `${item.serviceKey} (${item.status})`)} />
        <SummaryList title="Page access" items={detail.pages.map((item) => `${item.pageKey} (${item.status})`)} />
      </div>

      <div className="settings-panel">
        <h2 className="text-lg font-semibold text-slate-950">Audit log</h2>
        <div className="mt-3 space-y-3">
          {detail.auditLogs.length ? detail.auditLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <strong>{log.action}</strong>
              <div className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
            </div>
          )) : <p className="text-sm text-slate-500">No audit events for this user.</p>}
        </div>
      </div>
    </section>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="settings-panel">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.map((item) => <span key={item} className="badge-muted">{item}</span>) : <span className="text-sm text-slate-500">No direct records.</span>}
      </div>
    </div>
  );
}
