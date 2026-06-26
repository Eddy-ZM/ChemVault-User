import { FormEvent, useState } from "react";
import { ArrowLeft, LockKeyhole, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiClientError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isEmail, passwordError, required } from "../lib/validators";
import { BrandLogo } from "../components/BrandLogo";
import { UserSystemFooter } from "../components/UserSystemFooter";
import { ButtonSpinner } from "../components/UiPrimitives";
import { AgreementModal, type AgreementKind } from "../components/LegalAgreement";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState<AgreementKind | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "");
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const terms = form.get("terms") === "on";

    const nameRequired = required(name, "Name");
    if (nameRequired) return setError(nameRequired);
    if (!isEmail(email)) return setError("Enter a valid email address.");
    const passwordMessage = passwordError(password);
    if (passwordMessage) return setError(passwordMessage);
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!terms) return setError("You must agree to the Terms of Service and Privacy Policy.");

    setBusy(true);
    try {
      await register({
        name,
        email,
        password,
        institution: String(form.get("institution") || ""),
        fieldOfInterest: String(form.get("fieldOfInterest") || ""),
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card auth-card-wide" onSubmit={handleSubmit}>
        <Link className="auth-brand-link" to="/">
          <ArrowLeft className="h-4 w-4" />
          <BrandLogo compact title="ChemVault User Center" subtitle="Account enrollment" />
        </Link>
        <div>
          <h1>Create account</h1>
          <p>Set up your ChemVault profile for research tools, usage history, and future billing.</p>
        </div>
        <a className="secondary-button w-full justify-center" href="/api/auth/sso/apple/start?returnTo=/dashboard">
          <LockKeyhole className="h-4 w-4" />
          Continue with Apple ID
        </a>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or create with email
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        {error ? <div className="alert-error">{error}</div> : null}
        <div className="form-grid">
          <label>
            Name
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            Email
            <input name="email" autoComplete="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" autoComplete="new-password" minLength={8} type="password" required />
          </label>
          <label>
            Confirm Password
            <input name="confirmPassword" autoComplete="new-password" minLength={8} type="password" required />
          </label>
          <label>
            Institution / University
            <input name="institution" autoComplete="organization" />
          </label>
          <label>
            Field of Interest
            <select name="fieldOfInterest">
              <option value="">Select field</option>
              <option>Chemistry</option>
              <option>Computer Science</option>
              <option>Biology</option>
              <option>Materials Science</option>
              <option>Pharmaceutical Science</option>
            </select>
          </label>
        </div>
        <label className="checkbox-label">
          <input name="terms" type="checkbox" />
          <span>
            I agree to the{" "}
            <button className="legal-inline-link" type="button" onClick={() => setAgreementOpen("terms")}>
              Terms of Service
            </button>{" "}
            and{" "}
            <button className="legal-inline-link" type="button" onClick={() => setAgreementOpen("privacy")}>
              Privacy Policy
            </button>
            .
          </span>
        </label>
        <p className="text-xs leading-5 text-slate-500">
          Continuing with Apple ID creates or signs into a ChemVault main account under the same Terms and Privacy
          Policy.
        </p>
        <button className="primary-button w-full justify-center" disabled={busy} type="submit">
          {busy ? (
            <ButtonSpinner label="Creating account..." />
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Create account
            </>
          )}
        </button>
        <p className="text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link className="font-semibold text-blue-700" to="/login">
            Login
          </Link>
        </p>
      </form>
      <UserSystemFooter compact />
      {agreementOpen ? (
        <AgreementModal kind={agreementOpen} open={Boolean(agreementOpen)} onClose={() => setAgreementOpen(null)} />
      ) : null}
    </main>
  );
}
