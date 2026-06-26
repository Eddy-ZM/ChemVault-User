import { FormEvent, useEffect, useState } from "react";
import { Mail, Search, Trash2 } from "lucide-react";
import { ApiClientError, apiRequest } from "../lib/api";
import type { MailAccount, MailRole, MailStatus, User } from "../lib/types";

const mailRoles: MailRole[] = ["mailbox_user", "mailbox_admin", "mailbox_super"];
const mailStatuses: MailStatus[] = ["active", "disabled", "suspended", "deleted"];

export function MailAccountManager() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    userId: "",
    mailAddress: "",
    displayName: "",
    mailRole: "mailbox_user" as MailRole,
    mailboxQuotaMb: 1024,
    aliases: "",
    canSend: true,
    canReceive: true,
    canLoginMail: true,
  });

  async function load(next = { q: query, status }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.status) params.set("status", next.status);
    try {
      const [accountBody, userBody] = await Promise.all([
        apiRequest<{ accounts: MailAccount[] }>(`/api/admin/mail/accounts?${params.toString()}`),
        apiRequest<{ users: User[] }>("/api/admin/users"),
      ]);
      setAccounts(accountBody.accounts);
      setUsers(userBody.users);
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Mail accounts failed to load.");
    }
  }

  useEffect(() => {
    void load({ q: "", status: "" });
  }, []);

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    const body = await apiRequest<{ account: MailAccount }>("/api/admin/mail/accounts", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        aliases: form.aliases.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    });
    setAccounts((current) => [body.account, ...current]);
    setForm({ ...form, mailAddress: "", displayName: "", aliases: "" });
  }

  async function patchAccount(account: MailAccount, body: Partial<MailAccount>) {
    const response = await apiRequest<{ account: MailAccount }>(`/api/admin/mail/accounts/${account.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setAccounts((current) => current.map((item) => (item.id === account.id ? response.account : item)));
  }

  async function deleteAccount(account: MailAccount) {
    if (!window.confirm(`Disable and remove ${account.mailAddress}?`)) return;
    await apiRequest<{ ok: true }>(`/api/admin/mail/accounts/${account.id}`, { method: "DELETE" });
    setAccounts((current) => current.filter((item) => item.id !== account.id));
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Mail Account Manager</p>
          <h1>ChemVault mailboxes</h1>
        </div>
      </div>
      {error ? <div className="alert-error">{error}</div> : null}

      <form className="settings-panel" onSubmit={createAccount}>
        <h2 className="text-lg font-semibold text-slate-950">Assign mailbox</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <label>
            Main account
            <select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} required>
              <option value="">Select user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}
            </select>
          </label>
          <label>
            Mail address
            <input value={form.mailAddress} onChange={(event) => setForm({ ...form, mailAddress: event.target.value })} placeholder="user@chemvault.science" required />
          </label>
          <label>
            Display name
            <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
          </label>
          <label>
            Mail role
            <select value={form.mailRole} onChange={(event) => setForm({ ...form, mailRole: event.target.value as MailRole })}>
              {mailRoles.map((role) => <option key={role} value={role}>{role}</option>)}
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
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="checkbox-row"><input type="checkbox" checked={form.canSend} onChange={(event) => setForm({ ...form, canSend: event.target.checked })} /> Can send</label>
          <label className="checkbox-row"><input type="checkbox" checked={form.canReceive} onChange={(event) => setForm({ ...form, canReceive: event.target.checked })} /> Can receive</label>
          <label className="checkbox-row"><input type="checkbox" checked={form.canLoginMail} onChange={(event) => setForm({ ...form, canLoginMail: event.target.checked })} /> Can login mail</label>
          <button className="primary-button" type="submit"><Mail className="h-4 w-4" />Assign mailbox</button>
        </div>
      </form>

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
        <div className="table-wrap mt-5">
          <table>
            <thead>
              <tr>
                <th>Mailbox</th>
                <th>Main account</th>
                <th>Role</th>
                <th>Status</th>
                <th>Quota</th>
                <th>Flags</th>
                <th></th>
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
                    <select value={account.mailRole} onChange={(event) => void patchAccount(account, { mailRole: event.target.value as MailRole })}>
                      {mailRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={account.mailStatus} onChange={(event) => void patchAccount(account, { mailStatus: event.target.value as MailStatus })}>
                      {mailStatuses.filter((item) => item !== "deleted").map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="number" min={0} value={account.mailboxQuotaMb} onChange={(event) => void patchAccount(account, { mailboxQuotaMb: Number(event.target.value) })} />
                  </td>
                  <td>
                    <div className="grid gap-1 text-xs">
                      <label className="checkbox-row"><input type="checkbox" checked={account.canSend} onChange={(event) => void patchAccount(account, { canSend: event.target.checked })} /> Send</label>
                      <label className="checkbox-row"><input type="checkbox" checked={account.canReceive} onChange={(event) => void patchAccount(account, { canReceive: event.target.checked })} /> Receive</label>
                      <label className="checkbox-row"><input type="checkbox" checked={account.canLoginMail} onChange={(event) => void patchAccount(account, { canLoginMail: event.target.checked })} /> Login</label>
                    </div>
                  </td>
                  <td>
                    <button type="button" className="button-danger-icon" onClick={() => void deleteAccount(account)} title="Soft delete mailbox">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
