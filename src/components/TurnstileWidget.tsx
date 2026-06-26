import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const turnstileScriptId = "cloudflare-turnstile-script";
const turnstileScriptSrc = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(turnstileScriptId) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = turnstileScriptId;
    script.src = turnstileScriptSrc;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });
    document.head.appendChild(script);
  });
}

export function TurnstileWidget({
  siteKey,
  action,
  onVerify,
  onExpire,
  onError,
}: {
  siteKey: string;
  action?: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "light",
          callback: (token) => {
            setLoading(false);
            onVerify(token);
          },
          "expired-callback": () => {
            onExpire();
          },
          "error-callback": () => {
            setFailed(true);
            setLoading(false);
            onError();
          },
        });
        setLoading(false);
      })
      .catch(() => {
        setFailed(true);
        setLoading(false);
        onError();
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [action, onError, onExpire, onVerify, siteKey]);

  return (
    <div className="turnstile-panel">
      <div ref={containerRef} className="turnstile-widget" />
      {loading ? <p>Loading Cloudflare verification...</p> : null}
      {failed ? <p className="turnstile-error">Verification widget failed to load. Refresh the page and try again.</p> : null}
    </div>
  );
}
