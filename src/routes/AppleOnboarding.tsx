import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { UserSystemFooter } from "../components/UserSystemFooter";
import { ButtonSpinner } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";
import { ApiClientError, apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { User } from "../lib/types";

export function AppleOnboarding() {
  const { user, setUser } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const defaultName = useMemo(() => {
    if (!user) return "";
    const localPart = user.email.split("@")[0];
    return user.source === "apple" && user.name === localPart ? "" : user.name;
  }, [user]);

  if (!user) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);

    try {
      const body = await apiRequest<{ user: User }>("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          institution: String(form.get("institution") || ""),
          fieldOfInterest: String(form.get("fieldOfInterest") || ""),
          bio: String(form.get("bio") || ""),
        }),
      });
      setUser(body.user);
      notify({ title: "Profile completed", description: "Your Apple sign-in account is ready.", tone: "success" });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Profile completion failed.";
      setError(message);
      notify({ title: "Profile completion failed", description: message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page apple-onboarding-page">
      <section className="auth-card auth-card-wide apple-onboarding-card">
        <BrandLogo compact title="ChemVault User Center" subtitle="Apple sign-in profile" />
        <div className="apple-onboarding-header">
          <div className="apple-onboarding-icon">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1>Complete your ChemVault profile</h1>
            <p>
              Your Apple ID is verified. Add the research identity details that ChemVault services and administrators
              will use across the account system.
            </p>
          </div>
        </div>

        <div className="apple-account-strip">
          <div className="apple-signin-button apple-signin-button-static">
            <span className="apple-signin-mark" aria-hidden="true">
              
            </span>
            <span>Apple ID connected</span>
          </div>
          <p>{user.email}</p>
        </div>

        {error ? <div className="alert-error">{error}</div> : null}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Display name
              <input name="name" defaultValue={defaultName} placeholder="Your name" autoComplete="name" required />
            </label>
            <label>
              Institution / University
              <input name="institution" defaultValue={user.institution || ""} autoComplete="organization" />
            </label>
            <label>
              Field of Interest
              <select name="fieldOfInterest" defaultValue={user.fieldOfInterest || ""}>
                <option value="">Select field</option>
                <option>Chemistry</option>
                <option>Computer Science</option>
                <option>Biology</option>
                <option>Materials Science</option>
                <option>Pharmaceutical Science</option>
              </select>
            </label>
          </div>
          <label>
            Short bio
            <textarea name="bio" defaultValue={user.bio || ""} rows={4} placeholder="Research interests, lab, or role" />
          </label>
          <button className="primary-button w-full justify-center" type="submit" disabled={saving}>
            {saving ? (
              <ButtonSpinner label="Saving profile..." />
            ) : (
              <>
                Continue to dashboard
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </section>
      <UserSystemFooter compact />
    </main>
  );
}
