export const chemVaultLogoSrc = "/brand/chemvault-logo-no-text.png";

interface BrandLogoProps {
  title?: string;
  subtitle?: string;
  dark?: boolean;
  compact?: boolean;
  className?: string;
}

export function BrandLogo({
  title = "ChemVault",
  subtitle = "User Center",
  dark = false,
  compact = false,
  className = "",
}: BrandLogoProps) {
  return (
    <div className={`brand-block ${dark ? "brand-block-dark" : ""} ${compact ? "brand-block-compact" : ""} ${className}`}>
      <span className="brand-mark" aria-hidden="true">
        <img src={chemVaultLogoSrc} alt="" />
      </span>
      <div className="min-w-0">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}
