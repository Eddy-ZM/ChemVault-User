import { useEffect, useState } from "react";
import { Activity, Database, FlaskConical, RefreshCw, Server } from "lucide-react";
import { Link } from "react-router-dom";
import { ServiceCard } from "../components/ServiceCard";
import { StatCard } from "../components/StatCard";
import { UserAvatar } from "../components/UserAvatar";
import { ApiClientError, apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { ConnectedService, UsageResponse } from "../lib/types";
import { EmptyState, LoadingBlock } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";

export function Dashboard() {
  const { notify } = useToast();
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [services, setServices] = useState<ConnectedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(showToast = false) {
    try {
      setLoading(true);
      const [usageBody, serviceBody] = await Promise.all([
        apiRequest<UsageResponse>("/api/user/usage"),
        apiRequest<{ services: ConnectedService[] }>("/api/user/services"),
      ]);
      setUsage(usageBody);
      setServices(serviceBody.services);
      setError("");
      if (showToast) notify({ title: "Dashboard refreshed", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Dashboard failed to load.";
      setError(message);
      notify({ title: "Dashboard failed to load", description: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (!user) return null;

  const joined = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.createdAt));
  const usageSummary = usage?.summary;
  const limits = usage?.limits;

  return (
    <section className="page-section">
      <div className="dashboard-hero">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} size="lg" />
            <div>
              <p className="label">Welcome back</p>
              <h2 className="text-3xl font-semibold tracking-[0] text-slate-950">{user.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{user.email}</p>
            </div>
          </div>
          <Link className="secondary-button w-fit" to="/settings/profile">
            Edit profile
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <ProfileFact label="Role" value={user.role.toUpperCase()} />
          <ProfileFact label="Institution" value={user.institution || "Not set"} />
          <ProfileFact label="Field" value={user.fieldOfInterest || "Not set"} />
          <ProfileFact label="Joined" value={joined} />
        </div>
      </div>
      {error ? <div className="alert-error">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={FlaskConical}
          label="AI credits"
          value={`${usageSummary?.aiExtractionCreditsUsed ?? 0}`}
          detail={limits ? `Limit ${limits.aiCredits.toLocaleString()} credits this month` : "Loading usage limit"}
        />
        <StatCard
          icon={Database}
          label="Storage used"
          value={`${usageSummary?.storageUsedMb ?? 0} MB`}
          detail={limits ? `Limit ${limits.storageMb.toLocaleString()} MB` : "Loading storage limit"}
        />
        <StatCard
          icon={Server}
          label="API usage"
          value={`${usageSummary?.apiRequestsThisMonth ?? 0}`}
          detail={limits ? `Limit ${limits.apiRequests.toLocaleString()} requests` : "Loading API limit"}
        />
      </div>

      <div className="section-heading">
        <div>
          <p className="label">Connected ChemVault services</p>
          <h2>Product access</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => void load(true)} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Refresh
        </button>
      </div>
      {loading ? <LoadingBlock label="Loading services..." /> : <div className="service-grid">
        {services.map((service) => (
          <ServiceCard key={service.service} service={service} />
        ))}
      </div>}
      {!loading && !services.length ? <EmptyState title="No services connected" description="ChemVault services will appear here after an administrator grants access." /> : null}
    </section>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/30 bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
