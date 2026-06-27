import type { NavigateFunction } from "react-router-dom";

const allowedProductionHosts = new Set([
  "user.chemvault.science",
  "app.chemvault.science",
  "extract.chemvault.science",
  "file.chemvault.science",
  "docs.chemvault.science",
  "model.chemvault.science",
  "molecule.chemvault.science",
  "notif.chemvault.science",
  "chemvault.science",
]);

const allowedLocalHosts = new Set(["localhost", "127.0.0.1"]);

export function getSafeReturnTo(rawValue: string | null | undefined, fallback = "/dashboard"): string {
  if (!rawValue) return fallback;
  try {
    if (rawValue.startsWith("/")) return rawValue;
    const url = new URL(rawValue);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    if (allowedProductionHosts.has(url.hostname)) return url.toString();
    if (allowedLocalHosts.has(url.hostname)) return url.toString();
  } catch {
    return fallback;
  }
  return fallback;
}

export function navigateToReturnTo(returnTo: string, navigate: NavigateFunction) {
  if (returnTo.startsWith("/")) {
    navigate(returnTo, { replace: true });
    return;
  }
  window.location.assign(returnTo);
}
