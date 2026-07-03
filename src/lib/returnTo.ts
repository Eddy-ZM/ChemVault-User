import type { NavigateFunction } from "react-router-dom";

const allowedProductionHosts = new Set([
  "user.chemvault.science",
  "app.chemvault.science",
  "extract.chemvault.science",
  "file.chemvault.science",
  "files.chemvault.science",
  "files-staging.chemvault.science",
  "docs.chemvault.science",
  "model.chemvault.science",
  "molecule.chemvault.science",
  "notif.chemvault.science",
  "chemvault.science",
]);

const allowedLocalHosts = new Set(["localhost", "127.0.0.1"]);
const allowedPagesPreviewSuffixes = [
  ".chemvault-files.pages.dev",
  ".chemvault-user.pages.dev",
  ".chemvault-app.pages.dev",
  ".chemvault-docs.pages.dev",
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
  window.location.assign(returnTo);
}
