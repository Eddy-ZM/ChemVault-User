import { FormEvent, useEffect, useState } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { MailAccount, MailStatus, User } from "../lib/types";
import { ConfirmDialog, Modal } from "../components/Modal";
import { ButtonSpinner, EmptyState, LoadingBlock, StatusBadge } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";

const mailStatuses: MailStatus[] = ["active", "disabled", "suspended", "deleted"];
const emptyForm = {
  userId: "",
  mailAddress: "",
  displayName: "",
  mailStatus: "active" as MailStatus,
  mailboxQuotaMb: 1024,
  aliases: "",
};

export function MailAccountManager() {
  const { notify } = useToast();
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MailAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MailAccount | null>(null);

  async function load(next = { q: query, status }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.status) params.set("status", next.status);
    try {
      setLoading(true);
      const [accountBody, userBody] = await Promise.all([
        apiRequest<{ accounts: MailAccount[] }>(`/api/admin/mail/accounts?${params.toString()}`),
        apiRequest<{ users: User[] }>("/api/admin/users"),
      ]);
      setAccounts(accountBody.accounts);
      setUsers(userBody.users);
      setError("");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Mail accounts failed to load.";
      setError(message);
      notify({ title: "Mail accounts failed to load", description: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({ q: "", status: "" });
  }, []);

  function openCreate() {
    setEditingAccount(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(account: MailAccount) {
    setEditingAccount(account);
    setForm({
      userId: account.userId,
      mailAddress: account.mailAddress,
      displayName: account.displayName || "",
      mailStatus: account.mailStatus,
      mailboxQuotaMb: account.mailboxQuotaMb,
      aliases: account.aliases.join(", "),
    });
    setModalOpen(true);
  }

  async function submitAccount(event: FormEvent) {
    event.preventDefault();
    setSavingId(editingAccount?.id || "new");
    const payload = {
      ...form,
      aliases: form.aliases.split(",").map((item) => item.trim()).filter(Boolean),
    };

    try {
      if (editingAccount) {
        const body = await apiRequest<{ account: MailAccount }>(`/api/admin/mail/accounts/${editingAccount.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setAccounts((current) => current.map((account) => (account.id === editingAccount.id ? body.account : account)));
        notify({ title: "Mailbox updated", description: body.account.mailAddress, tone: "success" });
      } else {
        const body = await apiRequest<{ account: MailAccount }>("/api/admin/mail/accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setAccounts((current) => [body.account, ...current]);
        notify({ title: "Mailbox assigned", description: body.account.mailAddress, tone: "success" });
      }
      setModalOpen(false);
      setEditingAccount(null);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Mail account save failed.";
      notify({ title: "Mail account save failed", description: message, tone: "error" });
    } finally {
      setSavingId("");
    }
  }

  async function patchAccount(account: MailAccount, body: Partial<MailAccount>) {
    setSavingId(account.id);
    try {
      const response = await apiRequest<{ account: MailAccount }>(`/api/admin/mail/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setAccounts((current) => current.map((item) => (item.id === account.id ? response.account : item)));
      notify({ title: "Mailbox updated", description: response.account.mailAddress, tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Mailbox update failed.";
      notify({ title: "Mailbox update failed", description: message, tone: "error" });
    } finally {
      setSavingId("");
    }
  }

  async function deleteAccount(account: MailAccount) {
    setSavingId(account.id);
    try {
      await apiRequest<{ ok: true }>(`/api/admin/mail/accounts/${account.id}`, { method: "DELETE" });
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      notify({ title: "Mailbox deleted", description: account.mailAddress, tone: "success" });
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Mailbox delete failed.";
      notify({ title: "Mailbox delete failed", description: message, tone: "error" });
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Mail Account Manager</p>
          <h1>ChemVault mailboxes</h1>
        </div>
        <button className="primary-button" type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Assign mailbox
        </button>
      </div>
      {error ? <div className="alert-error">{error}</div> : null}

      <div className="settings-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            Search
            <input className="pl-9" value={query} onChange={(event) => { setQuery(event.target.value); void load({ q: event.target.value, status }); }} />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => { setStatus(event.target.value); void load({ q: query, status: event.target.value }); }}>
              <option value="">All</option>
              {mailStatuses.filter((item) => item !== "deleted").map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        {loading ? <LoadingBlock label="Loading mail accounts..." /> : (
        <div className="table-wrap mt-5">
          <table>
            <thead>
              <tr>
                <th>Mailbox</th>
                <th>Main account</th>
                <th>Status</th>
                <th>Quota</th>
                <th>Access control</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>{account.mailAddress}</strong>
                    <span>{account.aliases.join(", ") || "no aliases"}</span>
                  </td>
                  <td>{account.user?.email || account.userId}</td>
                  <td>
                    <select value={account.mailStatus} disabled={savingId === account.id} onChange={(event) => void patchAccount(account, { mailStatus: event.target.value as MailStatus })}>
                      {mailStatuses.filter((item) => item !== "deleted").map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <div className="mt-2"><StatusBadge value={account.mailStatus} /></div>
                  </td>
                  <td>
                    <input type="number" min={0} value={account.mailboxQuotaMb} disabled={savingId === account.id} onBlur={(event) => void patchAccount(account, { mailboxQuotaMb: Number(event.target.value) })} onChange={(event) => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, mailboxQuotaMb: Number(event.target.value) } : item))} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="badge-muted" to={`/admin/users/${account.userId}/services`}>Services</Link>
                      <Link className="badge-muted" to={`/admin/users/${account.userId}/permissions`}>Permissions</Link>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" className="icon-link" onClick={() => openEdit(account)} title="Edit mailbox">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button type="button" className="button-danger-icon" onClick={() => setDeleteTarget(account)} title="Soft delete mailbox">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!accounts.length ? <div className="mt-4"><EmptyState title="No mailboxes found" description="Assign a mailbox or adjust filters to see matching accounts." action={<button className="primary-button" type="button" onClick={openCreate}>Assign mailbox</button>} /></div> : null}
        </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editingAccount ? "Edit mailbox" : "Assign mailbox"}
        description={editingAccount ? editingAccount.mailAddress : "Bind a ChemVault mailbox to a main account."}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={() => setModalOpen(false)} disabled={Boolean(savingId)}>Cancel</button>
            <button className="primary-button" type="submit" form="mail-account-form" disabled={Boolean(savingId)}>
              {savingId ? <ButtonSpinner label="Saving..." /> : editingAccount ? "Save mailbox" : "Assign mailbox"}
            </button>
          </>
        }
      >
        <form id="mail-account-form" className="grid gap-4" onSubmit={submitAccount}>
          {!editingAccount ? (
            <label>
              Main account
              <select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} required>
                <option value="">Select user</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}
              </select>
            </label>
          ) : null}
          <div className="form-grid">
            <label>
              Mail address
              <input value={form.mailAddress} onChange={(event) => setForm({ ...form, mailAddress: event.target.value })} placeholder="user@chemvault.science" required />
            </label>
            <label>
              Display name
              <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            </label>
            <label>
              Mail status
              <select value={form.mailStatus} onChange={(event) => setForm({ ...form, mailStatus: event.target.value as MailStatus })}>
                {mailStatuses.filter((item) => item !== "deleted").map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Quota MB
              <input type="number" min={0} value={form.mailboxQuotaMb} onChange={(event) => setForm({ ...form, mailboxQuotaMb: Number(event.target.value) })} />
            </label>
            <label>
              Aliases
              <input value={form.aliases} onChange={(event) => setForm({ ...form, aliases: event.target.value })} placeholder="alias@chemvault.science, ..." />
            </label>
          </div>
          <p className="text-sm text-slate-500">
            Mail access, send, and receive permissions are controlled on the bound user's Services and Permissions pages.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete mailbox?"
        description={deleteTarget ? `This will soft delete ${deleteTarget.mailAddress}. The bound user account will remain active.` : ""}
        confirmLabel="Delete mailbox"
        tone="danger"
        busy={savingId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget ? void deleteAccount(deleteTarget) : undefined}
      />
    </section>
  );
}
