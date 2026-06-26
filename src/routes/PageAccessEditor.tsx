import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import type { AccessStatus, CatalogEntry, PageAccess } from "../lib/types";
import { LoadingBlock, SaveBar, StatusBadge } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";

const statuses: AccessStatus[] = ["active", "disabled", "suspended"];

export function PageAccessEditor() {
  const { id } = useParams();
  const { notify } = useToast();
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [draft, setDraft] = useState<Record<string, AccessStatus>>({});
  const [savedDraft, setSavedDraft] = useState<Record<string, AccessStatus>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      const body = await apiRequest<{ catalog: CatalogEntry[]; pages: PageAccess[] }>(`/api/admin/users/${id}/pages`);
      const nextDraft = Object.fromEntries(body.pages.map((page) => [page.pageKey, page.status as AccessStatus]));
      setCatalog(body.catalog);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setError("");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Page access failed to load.";
      setError(message);
      notify({ title: "Page access failed to load", description: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function save() {
    if (!id) return;
    setSaving(true);
    const pages = catalog.map((page) => ({ pageKey: page.key, status: draft[page.key] || "disabled" }));
    try {
      const body = await apiRequest<{ pages: PageAccess[] }>(`/api/admin/users/${id}/pages`, {
        method: "PATCH",
        body: JSON.stringify({ pages }),
      });
      const nextDraft = Object.fromEntries(body.pages.map((page) => [page.pageKey, page.status as AccessStatus]));
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setMessage("Page access saved.");
      notify({ title: "Page access saved", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Page access save failed.";
      notify({ title: "Page access save failed", description: message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (error) return <section className="page-section"><div className="alert-error">{error}</div></section>;
  const dirtyCount = catalog.filter((page) => (draft[page.key] || "disabled") !== (savedDraft[page.key] || "disabled")).length;

  function setAll(status: AccessStatus) {
    setDraft(Object.fromEntries(catalog.map((page) => [page.key, status])));
    setMessage("");
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Page Access</p>
          <h1>Cross-system page access</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/admin/users/${id}`} className="secondary-button">Back to user</Link>
          <button type="button" className="secondary-button" onClick={() => setDraft(savedDraft)} disabled={!dirtyCount || saving}><RotateCcw className="h-4 w-4" />Reset</button>
          <button type="button" className="primary-button" onClick={() => void save()} disabled={!dirtyCount || saving}><Save className="h-4 w-4" />{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
      {message ? <div className="alert-success">{message}</div> : null}
      <div className="settings-panel">
        <div className="mb-4 flex flex-wrap gap-2">
          {statuses.map((status) => <button key={status} className="secondary-button h-9" type="button" onClick={() => setAll(status)}>Set all {status}</button>)}
        </div>
        {loading ? <LoadingBlock label="Loading page access..." /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {catalog.map((page) => (
            <div key={page.key} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-slate-950">{page.name}</h2>
                  <StatusBadge value={draft[page.key] || "disabled"} />
                </div>
                <p className="font-mono text-xs text-slate-500">{page.path || page.key}</p>
              </div>
              <div className="grid grid-cols-3 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {statuses.map((status) => (
                  <button
                    key={status}
                    className={`h-9 rounded-md text-xs font-semibold transition ${draft[page.key] === status ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100" : "text-slate-500 hover:text-slate-900"}`}
                    type="button"
                    onClick={() => { setDraft({ ...draft, [page.key]: status }); setMessage(""); }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SaveBar dirtyCount={dirtyCount} saving={saving} onReset={() => setDraft(savedDraft)} onSave={() => void save()} />
    </section>
  );
}
