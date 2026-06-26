import { FormEvent, useState } from "react";
import { ArrowLeft, LockKeyhole, LogIn, Mail } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ApiClientError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isEmail, required } from "../lib/validators";
import { BrandLogo } from "../components/BrandLogo";
import { UserSystemFooter } from "../components/UserSystemFooter";
import { ButtonSpinner } from "../components/UiPrimitives";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";
  const ssoMessage =
    searchParams.get("sso") === "mail_not_configured"
      ? "ChemVault Mail SSO is wired in User Center, but MAIL_SYSTEM_SSO_URL is not configured yet."
      : searchParams.get("sso") === "apple_not_configured"
        ? "Apple ID login is wired in User Center, but Apple Developer credentials are not configured yet."
        : searchParams.get("sso") === "apple_failed"
          ? "Apple ID login could not be completed. Please try again or use email login."
      : "";

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
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link className="auth-brand-link" to="/">
          <ArrowLeft className="h-4 w-4" />
          <BrandLogo compact title="ChemVault User Center" subtitle="Secure sign-in" />
        </Link>
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
        <a className="secondary-button w-full justify-center" href={`/api/auth/sso/mail/start?returnTo=${encodeURIComponent(from)}`}>
          <Mail className="h-4 w-4" />
          Continue with ChemVault Mail
        </a>
        <a className="secondary-button w-full justify-center" href={`/api/auth/sso/apple/start?returnTo=${encodeURIComponent(from)}`}>
          <LockKeyhole className="h-4 w-4" />
          Continue with Apple ID
        </a>
        <p className="text-center text-sm text-slate-500">
          New to ChemVault?{" "}
          <Link className="font-semibold text-blue-700" to="/register">
            Create an account
          </Link>
        </p>
      </form>
      <UserSystemFooter compact />
    </main>
  );
}
