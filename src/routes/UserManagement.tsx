import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Mail, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { SystemRole, User, UserRole, UserStatus } from "../lib/types";

const roles: UserRole[] = ["free", "pro", "admin"];
const systemRoles: SystemRole[] = ["user", "staff", "service_admin", "admin", "super_admin", "owner"];
const statuses: UserStatus[] = ["active", "disabled", "deleted"];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [systemRoleFilter, setSystemRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  async function load(next = { q: query, role: roleFilter, systemRole: systemRoleFilter, status: statusFilter }) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.role) params.set("role", next.role);
    if (next.systemRole) params.set("systemRole", next.systemRole);
    if (next.status) params.set("status", next.status);

    try {
      const body = await apiRequest<{ users: User[] }>(`/api/admin/users?${params.toString()}`);
      setUsers(body.users);
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Users failed to load.");
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
    const response = await apiRequest<{ user: User }>(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setUsers((current) => current.map((item) => (item.id === user.id ? response.user : item)));
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Admin Console</p>
          <h1>User management</h1>
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
                    <select value={user.role} onChange={(event) => void updateUser(user, { role: event.target.value as UserRole })}>
                      {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={user.systemRole} onChange={(event) => void updateUser(user, { systemRole: event.target.value as SystemRole })}>
                      {systemRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={user.status} onChange={(event) => void updateUser(user, { status: event.target.value as UserStatus })}>
                      {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={user.mailAddress ? "badge-success" : "badge-muted"}>{user.mailAddress || "not assigned"}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="icon-link" to={`/admin/users/${user.id}`} title="User detail"><SlidersHorizontal className="h-4 w-4" /></Link>
                      <Link className="icon-link" to={`/admin/users/${user.id}/permissions`} title="Permissions"><KeyRound className="h-4 w-4" /></Link>
                      <Link className="icon-link" to="/admin/mail" title="Mail accounts"><Mail className="h-4 w-4" /></Link>
                    </div>
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
