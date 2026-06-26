import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          appearance?: "always" | "execute" | "interaction-only";
          execution?: "render" | "execute";
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
      execute: (container: HTMLElement | string) => void;
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

export interface TurnstileWidgetHandle {
  execute: () => void;
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  action?: string;
  appearance?: "always" | "execute" | "interaction-only";
  execution?: "render" | "execute";
  className?: string;
  showStatus?: boolean;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  onReady?: () => void;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(function TurnstileWidget(
  {
    siteKey,
    action,
    appearance = "always",
    execution = "render",
    className = "turnstile-panel",
    showStatus = true,
    onVerify,
    onExpire,
    onError,
    onReady,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      execute: () => {
        if (!containerRef.current || !window.turnstile) {
          setFailed(true);
          onError();
          return;
        }
        window.turnstile.execute(containerRef.current);
      },
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }),
    [onError],
  );

  useEffect(() => {
    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          appearance,
          execution,
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
        onReady?.();
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
  }, [action, appearance, execution, onError, onExpire, onReady, onVerify, siteKey]);

  return (
    <div className={className}>
      <div ref={containerRef} className="turnstile-widget" />
      {showStatus && loading ? <p>Loading Cloudflare verification...</p> : null}
      {showStatus && failed ? <p className="turnstile-error">Verification widget failed to load. Refresh the page and try again.</p> : null}
    </div>
  );
});
