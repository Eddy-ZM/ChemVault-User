import { BrandLogo } from "./BrandLogo";

export function UserSystemFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`user-system-footer ${compact ? "user-system-footer-compact" : ""}`}>
      <div className="user-system-footer-inner">
        <div className="user-system-footer-primary">
          <BrandLogo
            title="ChemVault Main Account System"
            subtitle="Identity Authority"
            className="user-system-footer-brand"
          />
          <p>Unified authority for ChemVault accounts, access, mail, and audit.</p>
        </div>
      </div>
      <div className="user-system-footer-base">
        <span>user.chemvault.science</span>
        <span>© {new Date().getFullYear()} ChemVault</span>
        <nav aria-label="ChemVault legal links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="https://chemvault.science/security">Security / Abuse</a>
        </nav>
      </div>
    </footer>
  );
}
