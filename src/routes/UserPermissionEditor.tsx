import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { PermissionDefinition, PermissionEffect, PermissionGrant } from "../lib/types";

type LocalEffect = PermissionEffect | "inherit";

interface PermissionEditorResponse {
  userId: string;
  systemRole: string;
  permissions: PermissionGrant[];
  rolePermissions: PermissionGrant[];
  effectivePermissions: string[];
  definitions: PermissionDefinition[];
}

export function UserPermissionEditor() {
  const { id } = useParams();
  const [data, setData] = useState<PermissionEditorResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, LocalEffect>>({});
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    try {
      const body = await apiRequest<PermissionEditorResponse>(`/api/admin/users/${id}/permissions`);
      setData(body);
      setDraft(Object.fromEntries(body.permissions.map((grant) => [grant.key, grant.effect])));
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Permissions failed to load.");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    const needle = query.trim().toLowerCase();
    for (const item of data?.definitions || []) {
      if (needle && !`${item.key} ${item.name} ${item.description || ""}`.toLowerCase().includes(needle)) continue;
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [data, query]);

  async function save() {
    if (!id) return;
    const permissions = Object.entries(draft)
      .filter(([, effect]) => effect === "allow" || effect === "deny")
      .map(([key, effect]) => ({ key, effect }));
    const body = await apiRequest<PermissionEditorResponse>(`/api/admin/users/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    });
    setData((current) => current ? { ...current, ...body } : body);
    setDraft(Object.fromEntries(body.permissions.map((grant) => [grant.key, grant.effect])));
    setMessage("Permissions saved.");
  }

  function setEffect(key: string, effect: LocalEffect) {
    setDraft((current) => ({ ...current, [key]: effect }));
    setMessage("");
  }

  if (error) return <section className="page-section"><div className="alert-error">{error}</div></section>;
  if (!data) return <section className="page-section"><div className="settings-panel">Loading permissions...</div></section>;

  const effective = new Set(data.effectivePermissions);
  const roleAllows = new Set(data.rolePermissions.filter((grant) => grant.effect === "allow").map((grant) => grant.key));

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">User Permission Editor</p>
          <h1>Direct permissions</h1>
          <p className="text-sm text-slate-500">System role: {data.systemRole}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-button" onClick={() => void load()}><RotateCcw className="h-4 w-4" />Reset</button>
          <button type="button" className="primary-button" onClick={() => void save()}><Save className="h-4 w-4" />Save</button>
        </div>
      </div>
      {message ? <div className="alert-success">{message}</div> : null}
      <div className="settings-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search permission key" />
          <Link to={`/admin/users/${id}`} className="secondary-button">Back to user</Link>
        </div>
      </div>

      {grouped.map(([category, permissions]) => (
        <div key={category} className="settings-panel">
          <h2 className="text-lg font-semibold capitalize text-slate-950">{category}</h2>
          <div className="mt-4 grid gap-3">
            {permissions.map((permission) => {
              const effect = draft[permission.key] || "inherit";
              return (
                <div key={permission.key} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-mono text-sm font-semibold text-slate-950">{permission.key}</div>
                      <div className="text-sm text-slate-500">
                        Effective: {effective.has(permission.key) ? "allowed" : "not allowed"}
                        {roleAllows.has(permission.key) ? " via role" : ""}
                      </div>
                    </div>
                    <div className="segmented">
                      {(["inherit", "allow", "deny"] as LocalEffect[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`segment-button ${effect === option ? `segment-active segment-${option}` : ""}`}
                          onClick={() => setEffect(permission.key, option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
