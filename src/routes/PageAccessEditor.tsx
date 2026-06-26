import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { AccessStatus, CatalogEntry, PageAccess } from "../lib/types";

const statuses: AccessStatus[] = ["active", "disabled", "suspended"];

export function PageAccessEditor() {
  const { id } = useParams();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [draft, setDraft] = useState<Record<string, AccessStatus>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    try {
      const body = await apiRequest<{ catalog: CatalogEntry[]; pages: PageAccess[] }>(`/api/admin/users/${id}/pages`);
      setCatalog(body.catalog);
      setDraft(Object.fromEntries(body.pages.map((page) => [page.pageKey, page.status as AccessStatus])));
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Page access failed to load.");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function save() {
    if (!id) return;
    const pages = catalog.map((page) => ({ pageKey: page.key, status: draft[page.key] || "disabled" }));
    const body = await apiRequest<{ pages: PageAccess[] }>(`/api/admin/users/${id}/pages`, {
      method: "PATCH",
      body: JSON.stringify({ pages }),
    });
    setDraft(Object.fromEntries(body.pages.map((page) => [page.pageKey, page.status as AccessStatus])));
    setMessage("Page access saved.");
  }

  if (error) return <section className="page-section"><div className="alert-error">{error}</div></section>;

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Page Access</p>
          <h1>Cross-system page access</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/admin/users/${id}`} className="secondary-button">Back to user</Link>
          <button type="button" className="primary-button" onClick={() => void save()}><Save className="h-4 w-4" />Save</button>
        </div>
      </div>
      {message ? <div className="alert-success">{message}</div> : null}
      <div className="settings-panel">
        <div className="grid gap-3 md:grid-cols-2">
          {catalog.map((page) => (
            <div key={page.key} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3">
                <h2 className="font-semibold text-slate-950">{page.name}</h2>
                <p className="font-mono text-xs text-slate-500">{page.path || page.key}</p>
              </div>
              <select value={draft[page.key] || "disabled"} onChange={(event) => setDraft({ ...draft, [page.key]: event.target.value as AccessStatus })}>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
