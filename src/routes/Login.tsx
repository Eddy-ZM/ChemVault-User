import { FormEvent, useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiClientError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isEmail, required } from "../lib/validators";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

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
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700" to="/">
          <ArrowLeft className="h-4 w-4" />
          ChemVault User Center
        </Link>
        <div>
          <h1>Login</h1>
          <p>Use your ChemVault identity to enter the unified user dashboard.</p>
        </div>
        {error ? <div className="alert-error">{error}</div> : null}
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
          <LogIn className="h-4 w-4" />
          {busy ? "Logging in..." : "Login"}
        </button>
        <p className="text-center text-sm text-slate-500">
          New to ChemVault?{" "}
          <Link className="font-semibold text-blue-700" to="/register">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
