import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { AccessStatus, CatalogEntry, ServiceAccess } from "../lib/types";

const statuses: AccessStatus[] = ["active", "disabled", "suspended"];

export function ServiceAccessEditor() {
  const { id } = useParams();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [draft, setDraft] = useState<Record<string, AccessStatus>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    try {
      const body = await apiRequest<{ catalog: CatalogEntry[]; services: ServiceAccess[] }>(`/api/admin/users/${id}/services`);
      setCatalog(body.catalog);
      setDraft(Object.fromEntries(body.services.map((service) => [service.serviceKey, service.status as AccessStatus])));
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Service access failed to load.");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function save() {
    if (!id) return;
    const services = catalog.map((service) => ({ serviceKey: service.key, status: draft[service.key] || "disabled" }));
    const body = await apiRequest<{ services: ServiceAccess[] }>(`/api/admin/users/${id}/services`, {
      method: "PATCH",
      body: JSON.stringify({ services }),
    });
    setDraft(Object.fromEntries(body.services.map((service) => [service.serviceKey, service.status as AccessStatus])));
    setMessage("Service access saved.");
  }

  if (error) return <section className="page-section"><div className="alert-error">{error}</div></section>;

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Service Access</p>
          <h1>ChemVault service access</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/admin/users/${id}`} className="secondary-button">Back to user</Link>
          <button type="button" className="primary-button" onClick={() => void save()}><Save className="h-4 w-4" />Save</button>
        </div>
      </div>
      {message ? <div className="alert-success">{message}</div> : null}
      <div className="settings-panel">
        <div className="grid gap-3 md:grid-cols-2">
          {catalog.map((service) => (
            <div key={service.key} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3">
                <h2 className="font-semibold text-slate-950">{service.name}</h2>
                <p className="font-mono text-xs text-slate-500">{service.key}</p>
              </div>
              <select value={draft[service.key] || "disabled"} onChange={(event) => setDraft({ ...draft, [service.key]: event.target.value as AccessStatus })}>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
