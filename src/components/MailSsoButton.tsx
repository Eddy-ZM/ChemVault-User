import { useCallback, useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { ApiClientError, apiRequest } from "../lib/api";
import { ButtonSpinner } from "./UiPrimitives";
import { TurnstileWidget, type TurnstileWidgetHandle } from "./TurnstileWidget";

interface MailSsoOptions {
  turnstile: {
    siteKey: string | null;
    required: boolean;
    action: string;
    mode: "background";
  };
  mailSsoConfigured: boolean;
}

export function MailSsoButton({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const widgetRef = useRef<TurnstileWidgetHandle | null>(null);
  const pendingRef = useRef(false);
  const [options, setOptions] = useState<MailSsoOptions | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void apiRequest<MailSsoOptions>("/api/auth/sso/mail/options")
      .then(setOptions)
      .catch(() => {
        setOptions({ turnstile: { siteKey: null, required: true, action: "mail_sso", mode: "background" }, mailSsoConfigured: false });
      });
  }, []);

  const resetChallenge = useCallback(() => {
    pendingRef.current = false;
    setBusy(false);
    widgetRef.current?.reset();
  }, []);

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setError("Cloudflare verification could not be completed. Try again.");
    resetChallenge();
  }, [resetChallenge]);

  const startMailSso = useCallback(
    async (turnstileToken: string) => {
      try {
        const body = await apiRequest<{ url: string }>("/api/auth/sso/mail/start", {
          method: "POST",
          body: JSON.stringify({ returnTo, turnstileToken }),
        });
        window.location.assign(body.url);
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : "ChemVault Mail login could not be started.";
        setError(message);
        resetChallenge();
      }
    },
    [resetChallenge, returnTo],
  );

  const handleVerify = useCallback(
    (token: string) => {
      if (!pendingRef.current) return;
      void startMailSso(token);
    },
    [startMailSso],
  );

  const handleClick = useCallback(() => {
    setError("");

    if (!options) return;
    if (!options.mailSsoConfigured) {
      setError("ChemVault Mail SSO URL is not configured yet.");
      return;
    }

    if (!options.turnstile.required) {
      window.location.assign(`/api/auth/sso/mail/start?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (!options.turnstile.siteKey) {
      setError("ChemVault Mail verification is not configured yet.");
      return;
    }

    if (!ready) {
      setError("Cloudflare verification is still loading. Try again in a moment.");
      return;
    }

    pendingRef.current = true;
    setBusy(true);
    widgetRef.current?.execute();
  }, [options, ready, returnTo]);

  const disabled = busy || !options;

  return (
    <div className="mail-sso-control">
      <button className="secondary-button w-full justify-center" disabled={disabled} type="button" onClick={handleClick}>
        {busy ? (
          <ButtonSpinner label="Checking..." />
        ) : (
          <>
            <Mail className="h-4 w-4" />
            Continue with ChemVault Mail SSO
          </>
        )}
      </button>
      {options?.mailSsoConfigured && options.turnstile.required && options.turnstile.siteKey ? (
        <TurnstileWidget
          ref={widgetRef}
          siteKey={options.turnstile.siteKey}
          action={options.turnstile.action}
          appearance="interaction-only"
          execution="execute"
          className="mail-turnstile-panel"
          showStatus={false}
          onReady={handleReady}
          onVerify={handleVerify}
          onExpire={resetChallenge}
          onError={handleTurnstileError}
        />
      ) : null}
      {error ? <p className="mail-sso-error">{error}</p> : null}
    </div>
  );
}
