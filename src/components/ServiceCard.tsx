import { ArrowUpRight, Settings } from "lucide-react";
import type { ConnectedService } from "../lib/types";
import { useToast } from "./Toast";

function statusMeta(status: string) {
  if (status === "active") return { label: "Active", className: "status-active" };
  if (status === "coming_soon") return { label: "Coming soon", className: "status-soon" };
  return { label: "Not connected", className: "status-idle" };
}

export function ServiceCard({ service }: { service: ConnectedService }) {
  const { notify } = useToast();
  const status = statusMeta(service.status);

  return (
    <article className="card flex min-h-[176px] flex-col justify-between">
      <div>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="icon-tile">
            <Settings className="h-5 w-5" />
          </div>
          <span className={`status-pill ${status.className}`}>{status.label}</span>
        </div>
        <h3 className="text-base font-semibold text-slate-950">{service.name}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
      </div>
      <button
        className="mt-5 inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={service.status === "coming_soon"}
        onClick={() =>
          notify({
            title: service.status === "active" ? `${service.name} settings` : "Service not connected",
            description:
              service.status === "active"
                ? "Service-specific management will open here once downstream admin routes are connected."
                : "Ask an administrator to enable this ChemVault service.",
            tone: service.status === "active" ? "info" : "warning",
          })
        }
      >
        Manage
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </article>
  );
}
