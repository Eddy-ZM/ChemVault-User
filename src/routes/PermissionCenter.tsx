import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ApiClientError, apiRequest } from "../lib/api";
import type { PermissionDefinition } from "../lib/types";

export function PermissionCenter() {
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ key: "", name: "", category: "custom", description: "" });
  const [error, setError] = useState("");

  async function load() {
    try {
      const body = await apiRequest<{ permissions: PermissionDefinition[] }>("/api/admin/permissions");
      setPermissions(body.permissions);
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Permissions failed to load.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const result = new Map<string, PermissionDefinition[]>();
    const needle = query.trim().toLowerCase();
    for (const permission of permissions) {
      if (needle && !`${permission.key} ${permission.name} ${permission.description || ""}`.toLowerCase().includes(needle)) continue;
      const list = result.get(permission.category) || [];
      list.push(permission);
      result.set(permission.category, list);
    }
    return [...result.entries()];
  }, [permissions, query]);

  async function createPermission(event: FormEvent) {
    event.preventDefault();
    const body = await apiRequest<{ permission: PermissionDefinition }>("/api/admin/permissions", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setPermissions((current) => [...current, body.permission].sort((a, b) => a.key.localeCompare(b.key)));
    setForm({ key: "", name: "", category: "custom", description: "" });
  }

  async function updateDescription(permission: PermissionDefinition, description: string) {
    const body = await apiRequest<{ permission: PermissionDefinition }>(`/api/admin/permissions/${permission.id}`, {
      method: "PATCH",
      body: JSON.stringify({ description }),
    });
    setPermissions((current) => current.map((item) => (item.id === permission.id ? body.permission : item)));
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Permission Center</p>
          <h1>Permission definitions</h1>
        </div>
      </div>
      {error ? <div className="alert-error">{error}</div> : null}

      <div className="settings-panel">
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            Search permissions
            <input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="page:file:view, mail, admin..." />
          </label>
          <form className="grid gap-2" onSubmit={createPermission}>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} placeholder="custom:thing:read" />
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Display name" />
            </div>
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" />
            <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="category" />
              <button className="primary-button" type="submit">Create permission</button>
            </div>
          </form>
        </div>
      </div>

      {grouped.map(([category, items]) => (
        <div key={category} className="settings-panel">
          <h2 className="text-lg font-semibold capitalize text-slate-950">{category}</h2>
          <div className="mt-4 grid gap-3">
            {items.map((permission) => (
              <div key={permission.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-mono text-sm font-semibold text-slate-950">{permission.key}</div>
                    <div className="text-sm text-slate-500">{permission.name}</div>
                  </div>
                  <input
                    className="lg:max-w-xl"
                    value={permission.description || ""}
                    onChange={(event) => setPermissions((current) => current.map((item) => item.id === permission.id ? { ...item, description: event.target.value } : item))}
                    onBlur={(event) => void updateDescription(permission, event.target.value)}
                    placeholder="Description"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
