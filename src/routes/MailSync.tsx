import { useState } from "react";
import { Braces, RefreshCw, UploadCloud } from "lucide-react";
import { ApiClientError, apiRequest } from "../lib/api";
import { useToast } from "../components/Toast";

const exampleJson = JSON.stringify(
  {
    superUsers: [{ email: "owner@chemvault.science", name: "Owner" }],
    adminUsers: [{ email: "admin@chemvault.science", name: "Admin" }],
  },
  null,
  2,
);

export function MailSync() {
  const { notify } = useToast();
  const [jsonText, setJsonText] = useState(exampleJson);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function manualSync() {
    try {
      setBusy(true);
      const payload = JSON.parse(jsonText);
      const body = await apiRequest<{ created: number; updated: number; skipped: number }>("/api/admin/mail-sync/manual", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(body);
      setError("");
      notify({ title: "Mail admins synchronized", description: `${body.created} created, ${body.updated} updated, ${body.skipped} skipped.`, tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Manual sync failed.";
      setError(message);
      notify({ title: "Manual sync failed", description: message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function runSync() {
    try {
      setBusy(true);
      const body = await apiRequest<{ status: string; message: string; requiredEnv: string[] }>("/api/admin/mail-sync/run", {
        method: "POST",
      });
      setResult(body);
      setError("");
      notify({ title: "API sync checked", description: body.message, tone: body.status === "todo" ? "info" : "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Run sync failed.";
      setError(message);
      notify({ title: "Run sync failed", description: message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function formatJson() {
    try {
      setJsonText(JSON.stringify(JSON.parse(jsonText), null, 2));
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON.";
      setError(message);
      notify({ title: "JSON format error", description: message, tone: "error" });
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Mail Admin Sync</p>
          <h1>Mail super/admin synchronization</h1>
        </div>
      </div>
      {error ? <div className="alert-error">{error}</div> : null}
      <div className="alert-info">
        Mail system super/admin users automatically receive main-system highest permissions. Mail super maps to
        super_admin, mail admin maps to admin, and mail-system super users cannot be downgraded by ordinary admins.
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="settings-panel">
          <h2 className="text-lg font-semibold text-slate-950">Manual JSON import</h2>
          <textarea
            className="mt-4 min-h-[320px] font-mono text-sm"
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="secondary-button" onClick={formatJson} disabled={busy}><Braces className="h-4 w-4" />Format JSON</button>
            <button type="button" className="primary-button" onClick={() => void manualSync()} disabled={busy}><UploadCloud className="h-4 w-4" />{busy ? "Syncing..." : "Sync JSON"}</button>
            <button type="button" className="secondary-button" onClick={() => void runSync()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />Run API sync</button>
          </div>
        </div>

        <div className="settings-panel">
          <h2 className="text-lg font-semibold text-slate-950">Sync result</h2>
          <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-50">
            {result ? JSON.stringify(result, null, 2) : "No sync result yet."}
          </pre>
          <p className="mt-4 text-sm text-slate-500">
            Automatic sync is reserved for the future mail.chemvault.science admin API and should be protected with
            MAIL_SYSTEM_SYNC_SECRET.
          </p>
        </div>
      </div>
    </section>
  );
}
