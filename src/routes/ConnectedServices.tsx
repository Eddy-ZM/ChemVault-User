import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { ServiceCard } from "../components/ServiceCard";
import { ApiClientError, apiRequest } from "../lib/api";
import type { ConnectedService } from "../lib/types";
import { EmptyState, LoadingBlock } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";

export function ConnectedServices() {
  const { notify } = useToast();
  const [services, setServices] = useState<ConnectedService[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(showToast = false) {
    try {
      setLoading(true);
      const body = await apiRequest<{ services: ConnectedService[] }>("/api/user/services");
      setServices(body.services);
      if (showToast) notify({ title: "Services refreshed", tone: "success" });
    } catch (err) {
      notify({ title: "Services failed to load", description: err instanceof ApiClientError ? err.message : "Try again later.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = services.filter((service) => {
    const matchQuery = !query || `${service.name} ${service.description} ${service.service}`.toLowerCase().includes(query.toLowerCase());
    const matchStatus = !status || service.status === status;
    return matchQuery && matchStatus;
  });

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Connected Services</p>
          <h1>ChemVault product access</h1>
        </div>
        <button className="secondary-button" type="button" onClick={() => void load(true)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="settings-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            Search services
            <input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="files, extract, molecule..." />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="not_connected">Not connected</option>
              <option value="coming_soon">Coming soon</option>
            </select>
          </label>
        </div>
      </div>
      {loading ? <LoadingBlock label="Loading services..." /> : null}
      <div className="service-grid">
        {filtered.map((service) => (
          <ServiceCard key={service.service} service={service} />
        ))}
      </div>
      {!loading && !filtered.length ? <EmptyState title="No services found" description="Adjust search or status filters to find services." /> : null}
    </section>
  );
}
