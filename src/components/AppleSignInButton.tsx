import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { User } from "../lib/types";
import { AppleLogoMark } from "./AppleLogoMark";
import { ButtonSpinner } from "./UiPrimitives";

interface AppleAuthResponse {
  authorization?: {
    code?: string;
    state?: string;
  };
  user?: unknown;
}

interface AppleClientOptions {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  nonce: string;
  usePopup: true;
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state: string;
          nonce: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<AppleAuthResponse>;
      };
    };
  }
}

let appleScriptPromise: Promise<void> | null = null;

function loadAppleScript(): Promise<void> {
  if (window.AppleID?.auth) return Promise.resolve();
  if (appleScriptPromise) return appleScriptPromise;

  appleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("appleid-auth-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Apple JS failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "appleid-auth-js";
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Apple JS failed to load."));
    document.head.appendChild(script);
  });

  return appleScriptPromise;
}

function appleFallbackUrl(returnTo: string, mode: "login" | "link") {
  const params = new URLSearchParams({ returnTo });
  if (mode === "link") params.set("mode", "link");
  return `/api/auth/sso/apple/start?${params.toString()}`;
}

export function AppleSignInButton({
  returnTo = "/dashboard",
  label = "Continue with Apple Account",
  mode = "login",
}: {
  returnTo?: string;
  label?: string;
  mode?: "login" | "link";
}) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startPopupSignIn() {
    setBusy(true);
    setError("");

    const params = new URLSearchParams({ returnTo, mode });
    try {
      const options = await apiRequest<AppleClientOptions>(`/api/auth/sso/apple/options?${params.toString()}`);
      await loadAppleScript();
      if (!window.AppleID?.auth) throw new Error("Apple JS is unavailable.");

      window.AppleID.auth.init({
        clientId: options.clientId,
        scope: options.scope,
        redirectURI: options.redirectUri,
        state: options.state,
        nonce: options.nonce,
        usePopup: true,
      });

      const appleResponse = await window.AppleID.auth.signIn();
      const code = appleResponse.authorization?.code;
      const state = appleResponse.authorization?.state || options.state;
      if (!code || !state) throw new Error("Apple Account did not return an authorization code.");

      const body = await apiRequest<{ user: User; returnTo?: string }>("/api/auth/sso/apple/complete", {
        method: "POST",
        body: JSON.stringify({
          code,
          state,
          user: appleResponse.user ? JSON.stringify(appleResponse.user) : undefined,
        }),
      });

      setUser(body.user);
      navigate(body.returnTo || returnTo, { replace: true });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "Apple Account sign-in failed.";
      setError(message);

      const lower = message.toLowerCase();
      if (lower.includes("not configured") || lower.includes("failed to load") || lower.includes("unavailable")) {
        window.location.assign(appleFallbackUrl(returnTo, mode));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button className="apple-signin-button" type="button" onClick={() => void startPopupSignIn()} disabled={busy}>
        <span className="apple-signin-mark" aria-hidden="true">
          <AppleLogoMark />
        </span>
        <span className="inline-flex items-center gap-2">{busy ? <ButtonSpinner label="Opening Apple Account..." /> : label}</span>
      </button>
      {error ? <p className="apple-signin-error">{error}</p> : null}
    </div>
  );
}
