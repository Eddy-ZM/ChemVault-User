import type { NavigateFunction } from "react-router-dom";

const allowedProductionHosts = new Set([
  "user.chemvault.science",
  "app.chemvault.science",
  "file.chemvault.science",
  "files.chemvault.science",
  "files-staging.chemvault.science",
  "docs.chemvault.science",
  "model.chemvault.science",
  "molecule.chemvault.science",
  "notif.chemvault.science",
  "lab.chemvault.science",
  "mailsys.uomsu.chemvault.science",
  "chemvault.science",
]);

const allowedLocalHosts = new Set(["localhost", "127.0.0.1"]);
const allowedPagesPreviewSuffixes = [
  ".chemvault-files.pages.dev",
  ".chemvault-user.pages.dev",
  ".chemvault-app.pages.dev",
  ".chemvault-docs.pages.dev",
  ".chemvault-lab.pages.dev",
  ".uom-su-mail-system.pages.dev",
];

export function getSafeReturnTo(rawValue: string | null | undefined, fallback = "/dashboard"): string {
  if (!rawValue) return fallback;
  try {
    if (rawValue.startsWith("/") && !rawValue.startsWith("//")) return rawValue;
    const url = new URL(rawValue);
    if (allowedProductionHosts.has(url.hostname) && url.protocol === "https:") return url.toString();
    if (isAllowedPagesPreviewHost(url.hostname) && url.protocol === "https:") return url.toString();
    if (allowedLocalHosts.has(url.hostname) && (url.protocol === "http:" || url.protocol === "https:")) {
      return url.toString();
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function isAllowedPagesPreviewHost(hostname: string): boolean {
  return allowedPagesPreviewSuffixes.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix));
}

export function navigateToReturnTo(returnTo: string, navigate: NavigateFunction) {
  if (returnTo.startsWith("/")) {
    navigate(returnTo, { replace: true });
    return;
  }
  if (shouldUseUserSystemHandoff(returnTo)) {
    window.location.assign(`/api/auth/handoff/start?returnTo=${encodeURIComponent(returnTo)}`);
    return;
  }
  window.location.assign(returnTo);
}

function shouldUseUserSystemHandoff(returnTo: string): boolean {
  try {
    const url = new URL(returnTo);
    const isUomMailSystemHost =
      url.hostname === "mailsys.uomsu.chemvault.science" ||
      url.hostname === "uom-su-mail-system.pages.dev" ||
      url.hostname.endsWith(".uom-su-mail-system.pages.dev");
    if (isUomMailSystemHost && url.protocol === "https:") return true;

    const isLabHost =
      url.hostname === "lab.chemvault.science" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".chemvault-lab.pages.dev");
    return isLabHost && url.pathname === "/auth/callback";
  } catch {
    return false;
  }
}
