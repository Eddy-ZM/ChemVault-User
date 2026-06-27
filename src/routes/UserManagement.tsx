import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Mail, RotateCcw, Search, SlidersHorizontal, Trash2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { MailAccount, MailRole, SystemRole, User, UserRole, UserStatus } from "../lib/types";
import { ButtonSpinner, EmptyState, LoadingBlock, StatusBadge } from "../components/UiPrimitives";
import { ConfirmDialog, Modal } from "../components/Modal";
import { useToast } from "../components/Toast";

const roles: UserRole[] = ["free", "pro", "admin"];
const systemRoles: SystemRole[] = ["user", "staff", "service_admin", "admin", "super_admin", "owner"];
const statuses: UserStatus[] = ["active", "disabled", "deleted"];
const mailRoles: MailRole[] = ["mailbox_user", "mailbox_admin", "mailbox_super"];

const initialCreateForm = {
  name: "",
  email: "",
  password: "",
  institution: "",
  fieldOfInterest: "",
  role: "free" as UserRole,
  systemRole: "user" as SystemRole,
  status: "active" as UserStatus,
  assignMailbox: true,
  mailAddress: "",
  mailDisplayName: "",
  mailRole: "mailbox_user" as MailRole,
  mailboxQuotaMb: 1024,
  aliases: "",
  canSend: true,
  canReceive: true,
  canLoginMail: true,
};

export function UserManagement() {
  const { notify } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [systemRoleFilter, setSystemRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [mailTarget, setMailTarget] = useState<User | null>(null);
  const [mailSaving, setMailSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [mailForm, setMailForm] = useState({
    mailAddress: "",
    displayName: "",
    mailRole: "mailbox_user" as MailRole,
    mailboxQuotaMb: 1024,
    aliases: "",
    canSend: true,
    canReceive: true,
    canLoginMail: true,
  });

  async function load(next = { q: query, role: roleFilter, systemRole: systemRoleFilter, status: statusFilter }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.role) params.set("role", next.role);
    if (next.systemRole) params.set("systemRole", next.systemRole);
    if (next.status) params.set("status", next.status);

    try {
      setLoading(true);
      const body = await apiRequest<{ users: User[] }>(`/api/admin/users?${params.toString()}`);
      setUsers(body.users);
      setError("");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Users failed to load.";
      setError(message);
      notify({ title: "Users failed to load", description: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({ q: "", role: "", systemRole: "", status: "" });
  }, []);

  const debouncedSearch = useMemo(() => {
    let timer: number | undefined;
    return (value: string) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load({ q: value, role: roleFilter, systemRole: systemRoleFilter, status: statusFilter }), 250);
    };
  }, [roleFilter, statusFilter, systemRoleFilter]);

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    debouncedSearch(event.target.value);
  }

  async function updateUser(user: User, body: Partial<{ role: UserRole; systemRole: SystemRole; status: UserStatus }>) {
    setSavingUserId(user.id);
    try {
      const response = await apiRequest<{ user: User }>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, ...response.user } : item)));
      notify({ title: "User updated", description: user.email, tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "User update failed.";
      notify({ title: "User update failed", description: message, tone: "error" });
    } finally {
      setSavingUserId("");
    }
  }

  function openMailModal(user: User) {
    const localPart = user.email.split("@")[0].replace(/[^a-z0-9._-]/gi, ".").toLowerCase();
    setMailTarget(user);
    setMailForm({
      mailAddress: `${localPart}@chemvault.science`,
      displayName: user.name,
      mailRole: "mailbox_user",
      mailboxQuotaMb: 1024,
      aliases: "",
      canSend: true,
      canReceive: true,
      canLoginMail: true,
    });
  }

  function openCreateModal() {
    setCreateForm(initialCreateForm);
    setCreateOpen(true);
  }

  function updateCreateForm(updates: Partial<typeof initialCreateForm>) {
    setCreateForm((current) => ({ ...current, ...updates }));
  }

  function handleCreateEmailChange(value: string) {
    const suggestedMailAddress = suggestMailAddress(value);
    setCreateForm((current) => ({
      ...current,
      email: value,
      mailAddress: current.mailAddress && current.mailAddress !== suggestMailAddress(current.email) ? current.mailAddress : suggestedMailAddress,
    }));
  }

  function handleCreateNameChange(value: string) {
    setCreateForm((current) => ({
      ...current,
      name: value,
      mailDisplayName: current.mailDisplayName && current.mailDisplayName !== current.name ? current.mailDisplayName : value,
    }));
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateSaving(true);
    try {
      const body = await apiRequest<{ user: User; mailAccount: MailAccount | null }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          institution: createForm.institution,
          fieldOfInterest: createForm.fieldOfInterest,
          role: createForm.role,
          systemRole: createForm.systemRole,
          status: createForm.status,
          assignMailbox: createForm.assignMailbox,
          mailAccount: createForm.assignMailbox
            ? {
                mailAddress: createForm.mailAddress,
                displayName: createForm.mailDisplayName || createForm.name,
                mailRole: createForm.mailRole,
                canSend: createForm.canSend,
                canReceive: createForm.canReceive,
                canLoginMail: createForm.canLoginMail,
                mailboxQuotaMb: createForm.mailboxQuotaMb,
                aliases: createForm.aliases.split(",").map((item) => item.trim()).filter(Boolean),
              }
            : null,
        }),
      });
      setUsers((current) => [body.user, ...current.filter((user) => user.id !== body.user.id)]);
      notify({
        title: "User created",
        description: body.mailAccount ? `${body.user.email} with ${body.mailAccount.mailAddress}` : body.user.email,
        tone: "success",
      });
      setCreateOpen(false);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "User creation failed.";
      notify({ title: "User creation failed", description: message, tone: "error" });
    } finally {
      setCreateSaving(false);
    }
  }

  async function createMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mailTarget) return;
    setMailSaving(true);
    try {
      const body = await apiRequest<{ account: MailAccount }>("/api/admin/mail/accounts", {
        method: "POST",
        body: JSON.stringify({
          userId: mailTarget.id,
          ...mailForm,
          aliases: mailForm.aliases.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      setUsers((current) =>
        current.map((user) =>
          user.id === mailTarget.id ? { ...user, mailAddress: body.account.mailAddress, mailStatus: body.account.mailStatus } : user,
        ),
      );
      notify({ title: "Mailbox assigned", description: body.account.mailAddress, tone: "success" });
      setMailTarget(null);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Mailbox creation failed.";
      notify({ title: "Mailbox creation failed", description: message, tone: "error" });
    } finally {
      setMailSaving(false);
    }
  }

  async function deleteUser(user: User) {
    setSavingUserId(user.id);
    try {
      await apiRequest<{ ok: true; deletedUser: { id: string; email: string } }>(`/api/admin/users/${user.id}`, { method: "DELETE" });
      setUsers((current) => current.filter((item) => item.id !== user.id));
      notify({ title: "User deleted", description: user.email, tone: "warning" });
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "User delete failed.";
      notify({ title: "User delete failed", description: message, tone: "error" });
    } finally {
      setSavingUserId("");
    }
  }

  function resetFilters() {
    setQuery("");
    setRoleFilter("");
    setSystemRoleFilter("");
    setStatusFilter("");
    void load({ q: "", role: "", systemRole: "", status: "" });
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Admin Console</p>
          <h1>User management</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="primary-button" type="button" onClick={openCreateModal}>
            <UserPlus className="h-4 w-4" />
            Add user
          </button>
          <button className="secondary-button" type="button" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </button>
        </div>
      </div>
      {error ? <div className="alert-error">{error}</div> : null}

      <div className="settings-panel">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_190px_160px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            Search
            <input className="pl-9" value={query} onChange={handleSearch} placeholder="email or name" />
          </label>
          <label>
            Account role
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); void load({ q: query, role: event.target.value, systemRole: systemRoleFilter, status: statusFilter }); }}>
              <option value="">All</option>
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label>
            System role
            <select value={systemRoleFilter} onChange={(event) => { setSystemRoleFilter(event.target.value); void load({ q: query, role: roleFilter, systemRole: event.target.value, status: statusFilter }); }}>
              <option value="">All</option>
              {systemRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); void load({ q: query, role: roleFilter, systemRole: systemRoleFilter, status: event.target.value }); }}>
              <option value="">All</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>

        {loading ? <LoadingBlock label="Loading users..." /> : (
        <div className="table-wrap mt-5">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>System role</th>
                <th>Status</th>
                <th>Mail</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </td>
                  <td>
                    <select value={user.role} disabled={savingUserId === user.id} onChange={(event) => void updateUser(user, { role: event.target.value as UserRole })}>
                      {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={user.systemRole} disabled={savingUserId === user.id} onChange={(event) => void updateUser(user, { systemRole: event.target.value as SystemRole })}>
                      {systemRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <div className="mt-2"><StatusBadge value={user.systemRole} /></div>
                  </td>
                  <td>
                    <select value={user.status} disabled={savingUserId === user.id} onChange={(event) => void updateUser(user, { status: event.target.value as UserStatus })}>
                      {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <div className="mt-2"><StatusBadge value={user.status} /></div>
                  </td>
                  <td>
                    <span className={user.mailAddress ? "badge-success" : "badge-muted"}>{user.mailAddress || "not assigned"}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="icon-link" to={`/admin/users/${user.id}`} title="User detail"><SlidersHorizontal className="h-4 w-4" /></Link>
                      <Link className="icon-link" to={`/admin/users/${user.id}/permissions`} title="Permissions"><KeyRound className="h-4 w-4" /></Link>
                      <button className="icon-link" type="button" onClick={() => openMailModal(user)} title="Assign mailbox" disabled={Boolean(user.mailAddress)}>
                        <Mail className="h-4 w-4" />
                      </button>
                      <button className="button-danger-icon" type="button" onClick={() => setDeleteTarget(user)} title="Delete user" disabled={user.status === "deleted"}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length ? (
            <div className="mt-4">
              <EmptyState title="No users found" description="Adjust the search or filters to find matching accounts." />
            </div>
          ) : null}
        </div>
        )}
      </div>

      <Modal
        open={createOpen}
        title="Add ChemVault account"
        description="Create a main account manually and optionally assign a ChemVault mailbox."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={() => setCreateOpen(false)} disabled={createSaving}>Cancel</button>
            <button className="primary-button" type="submit" form="create-user-form" disabled={createSaving}>
              {createSaving ? <ButtonSpinner label="Creating..." /> : "Create account"}
            </button>
          </>
        }
      >
        <form id="create-user-form" className="grid gap-5" onSubmit={createUser}>
          <div className="form-grid">
            <label>
              Display name
              <input value={createForm.name} onChange={(event) => handleCreateNameChange(event.target.value)} required />
            </label>
            <label>
              Primary email
              <input value={createForm.email} onChange={(event) => handleCreateEmailChange(event.target.value)} type="email" required />
            </label>
            <label>
              Temporary password
              <input
                value={createForm.password}
                onChange={(event) => updateCreateForm({ password: event.target.value })}
                type="password"
                minLength={8}
                placeholder="Optional"
                autoComplete="new-password"
              />
              <span className="inline-help">Leave blank for SSO-only access until a password is set later.</span>
            </label>
            <label>
              Institution
              <input value={createForm.institution} onChange={(event) => updateCreateForm({ institution: event.target.value })} />
            </label>
            <label>
              Field of interest
              <input value={createForm.fieldOfInterest} onChange={(event) => updateCreateForm({ fieldOfInterest: event.target.value })} />
            </label>
            <label>
              Account role
              <select value={createForm.role} onChange={(event) => updateCreateForm({ role: event.target.value as UserRole })}>
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label>
              System role
              <select value={createForm.systemRole} onChange={(event) => updateCreateForm({ systemRole: event.target.value as SystemRole })}>
                {systemRoles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={createForm.status} onChange={(event) => updateCreateForm({ status: event.target.value as UserStatus })}>
                {statuses.filter((status) => status !== "deleted").map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={createForm.assignMailbox}
                onChange={(event) => updateCreateForm({
                  assignMailbox: event.target.checked,
                  mailAddress: createForm.mailAddress || suggestMailAddress(createForm.email),
                  mailDisplayName: createForm.mailDisplayName || createForm.name,
                })}
              />
              Assign ChemVault mailbox now
            </label>

            {createForm.assignMailbox ? (
              <div className="mt-4 grid gap-4">
                <div className="form-grid">
                  <label>
                    Mail address
                    <input value={createForm.mailAddress} onChange={(event) => updateCreateForm({ mailAddress: event.target.value })} required />
                  </label>
                  <label>
                    Mail display name
                    <input value={createForm.mailDisplayName} onChange={(event) => updateCreateForm({ mailDisplayName: event.target.value })} />
                  </label>
                  <label>
                    Mail role
                    <select value={createForm.mailRole} onChange={(event) => updateCreateForm({ mailRole: event.target.value as MailRole })}>
                      {mailRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </label>
                  <label>
                    Quota MB
                    <input type="number" min={0} value={createForm.mailboxQuotaMb} onChange={(event) => updateCreateForm({ mailboxQuotaMb: Number(event.target.value) })} />
                  </label>
                </div>
                <label>
                  Aliases
                  <input value={createForm.aliases} onChange={(event) => updateCreateForm({ aliases: event.target.value })} placeholder="alias@chemvault.science, ..." />
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="checkbox-row"><input type="checkbox" checked={createForm.canSend} onChange={(event) => updateCreateForm({ canSend: event.target.checked })} /> Can send</label>
                  <label className="checkbox-row"><input type="checkbox" checked={createForm.canReceive} onChange={(event) => updateCreateForm({ canReceive: event.target.checked })} /> Can receive</label>
                  <label className="checkbox-row"><input type="checkbox" checked={createForm.canLoginMail} onChange={(event) => updateCreateForm({ canLoginMail: event.target.checked })} /> Can login mail</label>
                </div>
              </div>
            ) : null}
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(mailTarget)}
        title="Assign ChemVault mailbox"
        description={mailTarget ? `Create a mailbox for ${mailTarget.email}.` : undefined}
        onClose={() => setMailTarget(null)}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={() => setMailTarget(null)} disabled={mailSaving}>Cancel</button>
            <button className="primary-button" type="submit" form="quick-mailbox-form" disabled={mailSaving}>
              {mailSaving ? <ButtonSpinner label="Assigning..." /> : "Assign mailbox"}
            </button>
          </>
        }
      >
        <form id="quick-mailbox-form" className="grid gap-4" onSubmit={createMailbox}>
          <div className="form-grid">
            <label>
              Mail address
              <input value={mailForm.mailAddress} onChange={(event) => setMailForm({ ...mailForm, mailAddress: event.target.value })} required />
            </label>
            <label>
              Display name
              <input value={mailForm.displayName} onChange={(event) => setMailForm({ ...mailForm, displayName: event.target.value })} />
            </label>
            <label>
              Mail role
              <select value={mailForm.mailRole} onChange={(event) => setMailForm({ ...mailForm, mailRole: event.target.value as MailRole })}>
                {mailRoles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label>
              Quota MB
              <input type="number" min={0} value={mailForm.mailboxQuotaMb} onChange={(event) => setMailForm({ ...mailForm, mailboxQuotaMb: Number(event.target.value) })} />
            </label>
          </div>
          <label>
            Aliases
            <input value={mailForm.aliases} onChange={(event) => setMailForm({ ...mailForm, aliases: event.target.value })} placeholder="alias@chemvault.science, ..." />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="checkbox-row"><input type="checkbox" checked={mailForm.canSend} onChange={(event) => setMailForm({ ...mailForm, canSend: event.target.checked })} /> Can send</label>
            <label className="checkbox-row"><input type="checkbox" checked={mailForm.canReceive} onChange={(event) => setMailForm({ ...mailForm, canReceive: event.target.checked })} /> Can receive</label>
            <label className="checkbox-row"><input type="checkbox" checked={mailForm.canLoginMail} onChange={(event) => setMailForm({ ...mailForm, canLoginMail: event.target.checked })} /> Can login mail</label>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user?"
        description={deleteTarget ? `This will keep one deletion audit record for ${deleteTarget.email}, revoke sessions, remove provider links, and delete the user account.` : ""}
        confirmLabel="Delete user"
        tone="danger"
        busy={savingUserId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget ? void deleteUser(deleteTarget) : undefined}
      />
    </section>
  );
}

function suggestMailAddress(email: string): string {
  const localPart = email.split("@")[0].replace(/[^a-z0-9._-]/gi, ".").replace(/\.+/g, ".").replace(/^\.|\.$/g, "").toLowerCase();
  return localPart ? `${localPart}@chemvault.science` : "";
}
