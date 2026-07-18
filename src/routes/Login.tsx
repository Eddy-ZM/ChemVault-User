import { FormEvent, useEffect, useRef, useState } from "react";
import { LogIn } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ApiClientError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isEmail, required } from "../lib/validators";
import { BrandLogo } from "../components/BrandLogo";
import { UserSystemFooter } from "../components/UserSystemFooter";
import { ButtonSpinner, LoadingBlock } from "../components/UiPrimitives";
import { MailSsoButton } from "../components/MailSsoButton";
import { OAuthButtonGroup } from "../components/OAuthButtonGroup";
import { getSafeReturnTo, navigateToReturnTo } from "../lib/returnTo";

export function Login() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const verificationOverlayRef = useRef<HTMLDivElement>(null);
  const from = getSafeReturnTo(searchParams.get("returnTo") || (location.state as { from?: string } | null)?.from);
  const returnToQuery = `?returnTo=${encodeURIComponent(from)}`;
  const ssoMessage = getSsoMessage(searchParams.get("sso"));
  const isMailSystemHandoff = from.includes("uom-su-mail-system") || from.includes("mailsys.uomsu.chemvault.science");

  useEffect(() => {
    if (!loading && user) {
      navigateToReturnTo(from, navigate);
    }
  }, [from, loading, navigate, user]);

  useEffect(() => {
    if (!busy) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    verificationOverlayRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [busy]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    if (!isEmail(email)) return setError("Enter a valid email address.");
    const passwordRequired = required(password, "Password");
    if (passwordRequired) return setError(passwordRequired);

    setBusy(true);
    try {
      await login({ email, password });
      navigateToReturnTo(from, navigate);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand-lockup">
          <BrandLogo compact title="ChemVault User Center" subtitle="Secure sign-in" />
        </div>
        <div>
          <h1>Login</h1>
          <p>Use your ChemVault identity to enter the unified user dashboard.</p>
        </div>
        {error ? <div className="alert-error">{error}</div> : null}
        {ssoMessage ? <div className="alert-info">{ssoMessage}</div> : null}
        <label>
          Email
          <input name="email" autoComplete="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" autoComplete="current-password" type="password" required />
        </label>
        <label className="checkbox-label">
          <input name="remember" type="checkbox" />
          Remember me
        </label>
        <button className="primary-button w-full justify-center" disabled={busy} type="submit">
          {busy ? (
            <ButtonSpinner label="Logging in..." />
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Login
            </>
          )}
        </button>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <MailSsoButton returnTo={from} />
        <OAuthButtonGroup returnTo={from} />
        <p className="text-center text-sm text-slate-500">
          New to ChemVault?{" "}
          <Link className="font-semibold text-blue-700" to={`/register${returnToQuery}`}>
            Create an account
          </Link>
        </p>
        <p className="text-center text-xs leading-5 text-slate-500">
          Use of ChemVault is subject to the{" "}
          <Link className="font-semibold text-blue-700" to="/terms">Terms of Service</Link>{" "}
          and{" "}
          <Link className="font-semibold text-blue-700" to="/privacy">Privacy Policy</Link>.
        </p>
      </form>
      <UserSystemFooter compact />
      {busy ? (
        <div
          ref={verificationOverlayRef}
          className="login-verification-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-verification-title"
          aria-describedby="login-verification-description"
          tabIndex={-1}
        >
          <section className="login-verification-card">
            <BrandLogo compact title="ChemVault User Center" subtitle="Secure authentication" />
            <div className="login-verification-copy">
              <span>SECURE SIGN-IN</span>
              <h2 id="login-verification-title">Verifying your account</h2>
              <p id="login-verification-description">
                {isMailSystemHandoff
                  ? "Signing you in and checking your access to the Student Representative Mail System."
                  : "Signing you in and preparing access to your requested ChemVault service."}
              </p>
            </div>
            <LoadingBlock label="Checking identity and access permissions..." />
            <p className="login-verification-note">Keep this window open. You will be redirected automatically.</p>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function getSsoMessage(reason: string | null): string {
  if (!reason) return "";
  if (reason === "mail_not_configured") {
    return "ChemVault Mail SSO is wired in User Center, but MAIL_SYSTEM_SSO_URL is not configured yet.";
  }

  const [provider, ...rest] = reason.split("_");
  const providerName =
    provider === "apple"
      ? "Apple Account"
      : provider === "google"
        ? "Google"
        : provider === "microsoft"
          ? "Microsoft"
          : provider === "github"
            ? "GitHub"
            : "OAuth";
  const code = rest.join("_");

  if (provider === "microsoft") return "Microsoft sign-in is temporarily unavailable due to Microsoft-side limitations.";
  if (code === "not_configured") return `${providerName} login is wired in User Center, but provider credentials are not configured yet.`;
  if (code === "invalid_state") return `${providerName} login was blocked because the OAuth state was invalid or expired. Please try again.`;
  if (code === "missing_email") return `${providerName} did not provide an email address. Please use another sign-in method.`;
  if (code === "email_not_verified") return `${providerName} did not provide a verified email address. Please verify it with the provider first.`;
  if (code === "account_linked") return `This ${providerName} account is already linked to another ChemVault user.`;
  if (code === "failed") return `${providerName} login could not be completed. Please try again or use email login.`;
  return "Third-party sign-in could not be completed. Please try again or use email login.";
}
