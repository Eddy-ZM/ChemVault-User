import { useEffect, useState } from "react";
import { ChevronDown, RefreshCw, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { AuditLog, MailAccount, PageAccess, PermissionGrant, ServiceAccess, User } from "../lib/types";
import { LoadingBlock, StatusBadge } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";
import { ConfirmDialog } from "../components/Modal";

interface UserDetailResponse {
  user: User;
  mailAccount: MailAccount | null;
  permissions: PermissionGrant[];
  rolePermissions: PermissionGrant[];
  services: ServiceAccess[];
  pages: PageAccess[];
  usage: { aiExtractionCreditsUsed: number; storageUsedMb: number; apiRequestsThisMonth: number };
  auditLogs: AuditLog[];
  lifecycleJob: LifecycleJob | null;
}

interface LifecycleJob {
  id: string;
  status: "running" | "completed" | "failed";
  services: Array<{ service: string; status: "completed" | "failed"; error?: string }>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface DeleteUserResponse {
  ok: boolean;
  pending: boolean;
  lifecycleJobId: string;
  lifecycleStatus: string;
  forcedLocalDeletion?: boolean;
}

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [expandedLogId, setExpandedLogId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retryingLifecycle, setRetryingLifecycle] = useState(false);

  async function load(showToast = false) {
    if (!id) return;
    try {
      setLoading(true);
      const body = await apiRequest<UserDetailResponse>(`/api/admin/users/${id}`);
      setDetail(body);
      setError("");
      if (showToast) notify({ title: "User detail refreshed", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "User detail failed to load.";
      setError(message);
      notify({ title: "User detail failed to load", description: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function deleteUser() {
    if (!detail) return;
    try {
      setDeleting(true);
      const result = await apiRequest<DeleteUserResponse>(`/api/admin/users/${detail.user.id}`, { method: "DELETE" });
      if (result.pending) {
        notify({
          title: "Deletion pending",
          description: "The account is blocked. Retry failed services, or delete again to remove the local account.",
          tone: "warning",
        });
        await load();
      } else {
        notify({
          title: result.forcedLocalDeletion ? "Pending user removed" : "User deleted",
          description: detail.user.email,
          tone: "warning",
        });
        navigate("/admin/users", { replace: true });
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "User delete failed.";
      notify({ title: "User delete failed", description: message, tone: "error" });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function retryLifecycle() {
    if (!detail?.lifecycleJob) return;
    try {
      setRetryingLifecycle(true);
      const result = await apiRequest<{ ok: boolean; lifecycleStatus: string }>(`/api/admin/lifecycle/${detail.lifecycleJob.id}`, { method: "POST" });
      if (result.ok) {
        notify({ title: "Deletion completed", description: "All required services confirmed deletion.", tone: "success" });
        navigate("/admin/users", { replace: true });
      } else {
        notify({ title: "Deletion still incomplete", description: "One or more services still need attention.", tone: "warning" });
        await load();
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Lifecycle retry failed.";
      notify({ title: "Lifecycle retry failed", description: message, tone: "error" });
    } finally {
      setRetryingLifecycle(false);
    }
  }

  if (error) return <section className="page-section"><div className="alert-error">{error}</div></section>;
  if (!detail) return <section className="page-section"><LoadingBlock label="Loading user detail..." /></section>;

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">User Detail</p>
          <h1>{detail.user.name}</h1>
          <p className="text-sm text-slate-500">{detail.user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button" type="button" onClick={() => void load(true)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link className="secondary-button" to={`/admin/users/${detail.user.id}/permissions`}>Permissions</Link>
          <Link className="secondary-button" to={`/admin/users/${detail.user.id}/services`}>Services</Link>
          <Link className="secondary-button" to={`/admin/users/${detail.user.id}/pages`}>Pages</Link>
          <button className="danger-button" type="button" onClick={() => setConfirmDelete(true)} disabled={detail.user.status === "deleted"}>
            <Trash2 className="h-4 w-4" />
            Delete user
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="settings-panel">
          <h2 className="text-lg font-semibold text-slate-950">Identity</h2>
          <dl className="detail-list">
            <dt>Account role</dt><dd><StatusBadge value={detail.user.role} /></dd>
            <dt>System role</dt><dd><StatusBadge value={detail.user.systemRole} /></dd>
            <dt>Status</dt><dd><StatusBadge value={detail.user.globalStatus} /></dd>
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
              <dt>Mail role</dt><dd><StatusBadge value={detail.mailAccount.mailRole} /></dd>
              <dt>Status</dt><dd><StatusBadge value={detail.mailAccount.mailStatus} /></dd>
              <dt>Quota</dt><dd>{detail.mailAccount.mailboxQuotaMb} MB</dd>
              <dt>Aliases</dt><dd>{detail.mailAccount.aliases.join(", ") || "-"}</dd>
              <dt>Mail control</dt><dd>Follows Mail role assignment</dd>
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

      {detail.lifecycleJob && detail.user.status === "deletion_pending" ? (
        <div className="settings-panel border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Account deletion pending</h2>
              <p className="mt-1 text-sm text-slate-600">Sign-in and service access are blocked while required services finish deletion.</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => void retryLifecycle()} disabled={retryingLifecycle || detail.lifecycleJob.status !== "failed"}>
              <RefreshCw className={`h-4 w-4 ${retryingLifecycle ? "animate-spin" : ""}`} />
              Retry failed services
            </button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {detail.lifecycleJob.services.map((service) => (
              <div key={service.service} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><strong>{service.service}</strong><StatusBadge value={service.status} /></div>
                {service.error ? <p className="mt-2 text-xs text-red-700">{service.error}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryList title="Direct permissions" items={detail.permissions.map((item) => `${item.key} (${item.effect})`)} />
        <SummaryList title="Service access" items={detail.services.map((item) => `${item.serviceKey} (${item.status})`)} />
        <SummaryList title="Page access" items={detail.pages.map((item) => `${item.pageKey} (${item.status})`)} />
      </div>

      <div className="settings-panel">
        <h2 className="text-lg font-semibold text-slate-950">Audit log</h2>
        <div className="mt-3 space-y-3">
          {detail.auditLogs.length ? detail.auditLogs.map((log) => (
            <button key={log.id} className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm transition hover:border-cyan-200 hover:bg-cyan-50" type="button" onClick={() => setExpandedLogId((current) => current === log.id ? "" : log.id)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong>{log.action}</strong>
                  <div className="text-slate-500">{new Date(log.createdAt).toLocaleString()}</div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${expandedLogId === log.id ? "rotate-180" : ""}`} />
              </div>
              {expandedLogId === log.id ? (
                <pre className="mt-3 max-h-44 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-50">{JSON.stringify(log.details || {}, null, 2)}</pre>
              ) : null}
            </button>
          )) : <p className="text-sm text-slate-500">No audit events for this user.</p>}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={isDeletionPending(detail.user) ? "Remove pending user?" : "Delete this user?"}
        description={deleteDescription(detail.user)}
        confirmLabel={isDeletionPending(detail.user) ? "Remove user" : "Delete user"}
        tone="danger"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void deleteUser()}
      />
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

function isDeletionPending(user: User): boolean {
  return user.status === "deletion_pending" || user.globalStatus === "deletion_pending";
}

function deleteDescription(user: User): string {
  if (isDeletionPending(user)) {
    return `This account is already blocked for deletion. This will remove the local account record for ${user.email} even if a remote lifecycle service is still failing now.`;
  }
  return `This will keep one deletion audit record for ${user.email}, revoke sessions, remove provider links, and delete the user account.`;
}
