import { useEffect, useState } from "react";
import { Activity, Database, FlaskConical, KeyRound, Server } from "lucide-react";
import { Link } from "react-router-dom";
import { ServiceCard } from "../components/ServiceCard";
import { StatCard } from "../components/StatCard";
import { UserAvatar } from "../components/UserAvatar";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { ConnectedService, UsageResponse } from "../lib/types";

export function Dashboard() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [services, setServices] = useState<ConnectedService[]>([]);

  useEffect(() => {
    void Promise.all([
      apiRequest<UsageResponse>("/api/user/usage").then(setUsage),
      apiRequest<{ services: ConnectedService[] }>("/api/user/services").then((body) => setServices(body.services)),
    ]);
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

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          icon={FlaskConical}
          label="AI extraction credits used"
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
          label="API requests this month"
          value={`${usageSummary?.apiRequestsThisMonth ?? 0}`}
          detail={limits ? `Limit ${limits.apiRequests.toLocaleString()} requests` : "Loading API limit"}
        />
      </div>

      <div className="section-heading">
        <div>
          <p className="label">Connected ChemVault services</p>
          <h2>Product access</h2>
        </div>
        <Activity className="h-5 w-5 text-cyan-700" />
      </div>
      <div className="service-grid">
        {services.map((service) => (
          <ServiceCard key={service.service} service={service} />
        ))}
      </div>
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
