import { Landmark, LockKeyhole, Scale, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

const authorityPillars = [
  { icon: ShieldCheck, label: "Identity authority" },
  { icon: Scale, label: "Permission governance" },
  { icon: LockKeyhole, label: "Mail and access control" },
] as const;

export function UserSystemFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`user-system-footer ${compact ? "user-system-footer-compact" : ""}`}>
      <div className="user-system-footer-grid">
        <div className="min-w-0">
          <BrandLogo
            dark
            title="ChemVault User System"
            subtitle="Identity Center • Permission Center"
            className="user-system-footer-brand"
          />
          <p>
            Central authority for ChemVault accounts, mail identities, service access, administrator control, and audit
            stewardship.
          </p>
        </div>
        <div className="user-system-footer-pillars">
          {authorityPillars.map((item) => (
            <div className="user-system-footer-pillar" key={item.label}>
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="user-system-footer-base">
        <span className="inline-flex items-center gap-2">
          <Landmark className="h-4 w-4 text-amber-300" />
          ChemVault Main Account System
        </span>
        <span>user.chemvault.science</span>
        <span>Identity • Permissions • Mail • Audit</span>
      </div>
    </footer>
  );
}
