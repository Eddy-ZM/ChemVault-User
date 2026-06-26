import { FileCheck2, Fingerprint, Landmark, LockKeyhole, Network, Scale, ServerCog, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

const authorityPillars = [
  { icon: Fingerprint, label: "Identity Registry", value: "Main Account" },
  { icon: Scale, label: "Permission Ledger", value: "Role + Policy" },
  { icon: LockKeyhole, label: "Access Boundary", value: "Mail + Services" },
] as const;

const operatingScope = [
  { icon: ShieldCheck, label: "Session Security" },
  { icon: Network, label: "Service Federation" },
  { icon: FileCheck2, label: "Audit Retention" },
  { icon: ServerCog, label: "Admin Console" },
] as const;

export function UserSystemFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`user-system-footer ${compact ? "user-system-footer-compact" : ""}`}>
      <div className="user-system-footer-crown" aria-hidden="true" />
      <div className="user-system-footer-grid">
        <div className="user-system-footer-authority">
          <BrandLogo
            dark
            title="ChemVault Main Account System"
            subtitle="Identity Center • Permission Center • Admin Console"
            className="user-system-footer-brand"
          />
          <p>
            Central authority for ChemVault identity, account governance, mail binding, page access, service permission,
            and administrator audit control.
          </p>
          <div className="user-system-footer-scope">
            {operatingScope.map((item) => (
              <span key={item.label}>
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <div className="user-system-footer-pillars">
          {authorityPillars.map((item) => (
            <div className="user-system-footer-pillar" key={item.label}>
              <item.icon className="h-4 w-4" />
              <span>
                <strong>{item.label}</strong>
                <small>{item.value}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="user-system-footer-base">
        <span className="inline-flex items-center gap-2">
          <Landmark className="h-4 w-4 text-amber-300" />
          Authority Boundary: user.chemvault.science
        </span>
        <span>Identity • Permissions • Mail • Audit</span>
        <nav aria-label="ChemVault legal links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}
