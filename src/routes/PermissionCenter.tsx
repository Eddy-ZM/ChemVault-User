import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ApiClientError, apiRequest } from "../lib/api";
import type { PermissionDefinition } from "../lib/types";
import { Modal } from "../components/Modal";
import { EmptyState, LoadingBlock } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";

export function PermissionCenter() {
  const { notify } = useToast();
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ key: "", name: "", category: "custom", description: "" });
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [savingPermissionId, setSavingPermissionId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      const body = await apiRequest<{ permissions: PermissionDefinition[] }>("/api/admin/permissions");
      setPermissions(body.permissions);
      setError("");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Permissions failed to load.";
      setError(message);
      notify({ title: "Permissions failed to load", description: message, tone: "error" });
    } finally {
      setLoading(false);
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
      if (activeCategory !== "all" && permission.category !== activeCategory) continue;
      const list = result.get(permission.category) || [];
      list.push(permission);
      result.set(permission.category, list);
    }
    return [...result.entries()];
  }, [activeCategory, permissions, query]);

  const categories = useMemo(() => ["all", ...Array.from(new Set(permissions.map((permission) => permission.category))).sort()], [permissions]);

  async function createPermission(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const body = await apiRequest<{ permission: PermissionDefinition }>("/api/admin/permissions", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setPermissions((current) => [...current, body.permission].sort((a, b) => a.key.localeCompare(b.key)));
      setActiveCategory(body.permission.category);
      setForm({ key: "", name: "", category: "custom", description: "" });
      setCreateOpen(false);
      notify({ title: "Permission created", description: body.permission.key, tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Permission creation failed.";
      notify({ title: "Permission creation failed", description: message, tone: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function updateDescription(permission: PermissionDefinition, description: string) {
    setSavingPermissionId(permission.id);
    try {
      const body = await apiRequest<{ permission: PermissionDefinition }>(`/api/admin/permissions/${permission.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description }),
      });
      setPermissions((current) => current.map((item) => (item.id === permission.id ? body.permission : item)));
      notify({ title: "Permission updated", description: permission.key, tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Permission update failed.";
      notify({ title: "Permission update failed", description: message, tone: "error" });
      await load();
    } finally {
      setSavingPermissionId("");
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Permission Center</p>
          <h1>Permission definitions</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create permission
        </button>
      </div>
      {error ? <div className="alert-error">{error}</div> : null}

      <div className="settings-panel">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            Search permissions
            <input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="page:file:view, mail, admin..." />
          </label>
          <p className="inline-help">{permissions.length} permissions across {Math.max(0, categories.length - 1)} categories.</p>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              className={`h-9 shrink-0 rounded-lg border px-3 text-sm font-semibold transition ${activeCategory === category ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700"}`}
              type="button"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingBlock label="Loading permissions..." /> : grouped.map(([category, items]) => (
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
                    disabled={savingPermissionId === permission.id}
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
      {!loading && !grouped.length ? <EmptyState title="No permissions found" description="Adjust the search or category filter." /> : null}

      <Modal
        open={createOpen}
        title="Create permission"
        description="Add a custom permission key that can be granted to users later."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</button>
            <button className="primary-button" type="submit" form="create-permission-form" disabled={creating}>{creating ? "Creating..." : "Create permission"}</button>
          </>
        }
      >
        <form id="create-permission-form" className="grid gap-4" onSubmit={createPermission}>
          <div className="form-grid">
            <label>
              Permission key
              <input value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value })} placeholder="custom:thing:read" required />
            </label>
            <label>
              Display name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Display name" required />
            </label>
          </div>
          <label>
            Category
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="custom" required />
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} />
          </label>
        </form>
      </Modal>
    </section>
  );
}
