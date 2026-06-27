import { useState } from "react";
import { ButtonSpinner } from "./UiPrimitives";

export type OAuthProvider = "google" | "microsoft" | "github";

const providerMeta: Record<OAuthProvider, { label: string; className: string }> = {
  google: { label: "Google", className: "oauth-signin-button-google" },
  microsoft: { label: "Microsoft", className: "oauth-signin-button-microsoft" },
  github: { label: "GitHub", className: "oauth-signin-button-github" },
};

function oauthStartUrl(provider: OAuthProvider, returnTo: string, mode: "login" | "link") {
  const params = new URLSearchParams({ returnTo });
  if (mode === "link") params.set("mode", "link");
  return `/api/auth/sso/${provider}/start?${params.toString()}`;
}

export function OAuthSignInButton({
  provider,
  returnTo = "/dashboard",
  mode = "login",
  label,
  disabledReason,
}: {
  provider: OAuthProvider;
  returnTo?: string;
  mode?: "login" | "link";
  label?: string;
  disabledReason?: string;
}) {
  const [busy, setBusy] = useState(false);
  const meta = providerMeta[provider];

  function startOAuth() {
    if (disabledReason) return;
    setBusy(true);
    window.location.assign(oauthStartUrl(provider, returnTo, mode));
  }

  return (
    <div className="grid gap-2">
      <button
        className={`oauth-signin-button ${meta.className}`}
        type="button"
        onClick={startOAuth}
        disabled={busy || Boolean(disabledReason)}
        aria-label={label || `Continue with ${meta.label}`}
        title={disabledReason || undefined}
      >
        <ProviderIcon provider={provider} />
        <span className="inline-flex items-center gap-2">
          {busy ? <ButtonSpinner label={`Opening ${meta.label}...`} /> : label || `Continue with ${meta.label}`}
        </span>
      </button>
      {disabledReason ? <p className="oauth-unavailable-note">{disabledReason}</p> : null}
    </div>
  );
}

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.4z" />
        <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.5 17c-.9.6-2 1-3.5 1-2.7 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22z" />
        <path fill="#FBBC05" d="M6.3 13.8A6 6 0 0 1 6 12c0-.6.1-1.2.3-1.8V7.6H3A10 10 0 0 0 3 16.4l3.3-2.6z" />
        <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.6l3.3 2.6C7.1 7.8 9.3 6 12 6z" />
      </svg>
    );
  }

  if (provider === "microsoft") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
        <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
        <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
        <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.4.7-4.1-1.5-4.1-1.5-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.3-3.2-.1-.3-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2A11.2 11.2 0 0 1 12 4.6c1 0 2.1.1 3 .4 2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.9.1 3.2.8.9 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" />
    </svg>
  );
}
