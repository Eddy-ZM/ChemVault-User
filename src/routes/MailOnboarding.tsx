import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Mail, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { UserSystemFooter } from "../components/UserSystemFooter";
import { ButtonSpinner, StatusBadge } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";
import { ApiClientError, apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getSafeReturnTo, navigateToReturnTo } from "../lib/returnTo";
import type { MailAccount, User } from "../lib/types";

type OnboardingMode = "bind" | "apply";

const providerLabels: Record<string, string> = {
  apple: "Apple Account",
  google: "Google",
  github: "GitHub",
};

function suggestedMailbox(email: string): string {
  const localPart = email
    .split("@")[0]
    .replace(/[^a-z0-9._-]/gi, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")
    .toLowerCase();
  return `${localPart || "user"}@chemvault.science`;
}

export function MailOnboarding() {
  const { user, setUser } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnTo = getSafeReturnTo(searchParams.get("returnTo"));
  const returnTo = rawReturnTo.startsWith("/onboarding/mail") ? "/dashboard" : rawReturnTo;
  const provider = searchParams.get("provider") || user?.source || "";
  const providerLabel = providerLabels[provider] || "third-party";
  const defaultMailAddress = useMemo(() => suggestedMailbox(user?.email || ""), [user?.email]);
  const [mode, setMode] = useState<OnboardingMode>("bind");
  const [mailAddress, setMailAddress] = useState(defaultMailAddress);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.mailAccount) navigateToReturnTo(returnTo, navigate);
  }, [navigate, returnTo, user?.mailAccount]);

  useEffect(() => {
    setMailAddress(defaultMailAddress);
  }, [defaultMailAddress]);

  useEffect(() => {
    setDisplayName(user?.name || "");
    setReason(`I need a ChemVault mailbox for this ChemVault account created with ${providerLabel} sign-in.`);
  }, [providerLabel, user?.name]);

  if (!user) return null;

  function continueToTarget() {
    navigateToReturnTo(returnTo, navigate);
  }

  async function bindMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSentMessage("");
    setBusy(true);
    try {
      const body = await apiRequest<{ ok: true; mailAccount: MailAccount; user: User }>("/api/user/mail-binding", {
        method: "POST",
        body: JSON.stringify({ mailAddress, password }),
      });
      setUser(body.user);
      notify({ title: "Mailbox bound", description: body.mailAccount.mailAddress, tone: "success" });
      continueToTarget();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Mailbox binding failed.";
      setError(message);
      notify({ title: "Mailbox binding failed", description: message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function applyForMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSentMessage("");
    setBusy(true);
    try {
      const body = await apiRequest<{ ok: true; requestedMailAddress: string; sentTo: string }>("/api/user/mail-application", {
        method: "POST",
        body: JSON.stringify({ requestedMailAddress: mailAddress, displayName, reason }),
      });
      setSentMessage(`Request sent to ${body.sentTo} for ${body.requestedMailAddress}.`);
      notify({ title: "Mailbox request sent", description: body.requestedMailAddress, tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Mailbox request failed.";
      setError(message);
      notify({ title: "Mailbox request failed", description: message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page mail-onboarding-page">
      <section className="auth-card auth-card-wide mail-onboarding-card">
        <BrandLogo compact title="ChemVault User Center" subtitle={`${providerLabel} sign-in`} />
        <div className="mail-onboarding-header">
          <div className="apple-onboarding-icon">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h1>Do you have a ChemVault mailbox?</h1>
            <p>{user.email}</p>
          </div>
        </div>

        {error ? <div className="alert-error">{error}</div> : null}
        {sentMessage ? <div className="alert-success">{sentMessage}</div> : null}

        {user.mailAccount ? (
          <div className="external-identity-card">
            <div>
              <p className="font-semibold text-slate-950">{user.mailAccount.mailAddress}</p>
              <p className="mt-1 text-sm text-slate-500">Mailbox is already bound.</p>
            </div>
            <StatusBadge value={user.mailAccount.mailStatus} />
          </div>
        ) : (
          <>
            <div className="mail-onboarding-choice">
              <button className={mode === "bind" ? "mail-choice-active" : ""} type="button" onClick={() => setMode("bind")}>
                <KeyRound className="h-4 w-4" />
                I have one
              </button>
              <button className={mode === "apply" ? "mail-choice-active" : ""} type="button" onClick={() => setMode("apply")}>
                <Send className="h-4 w-4" />
                Request one
              </button>
            </div>

            {mode === "bind" ? (
              <form className="grid gap-4" onSubmit={bindMailbox}>
                <label>
                  ChemVault mailbox
                  <input
                    value={mailAddress}
                    onChange={(event) => setMailAddress(event.target.value)}
                    placeholder="name@chemvault.science"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  ChemVault Mail password
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <div className="mail-onboarding-actions">
                  <button className="secondary-button" type="button" onClick={continueToTarget} disabled={busy}>
                    Later
                  </button>
                  <button className="primary-button" type="submit" disabled={busy}>
                    {busy ? <ButtonSpinner label="Binding..." /> : <><CheckCircle2 className="h-4 w-4" />Bind mailbox</>}
                  </button>
                </div>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={applyForMailbox}>
                <div className="form-grid">
                  <label>
                    Requested mailbox
                    <input value={mailAddress} onChange={(event) => setMailAddress(event.target.value)} required />
                  </label>
                  <label>
                    Mail display name
                    <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={user.name} />
                  </label>
                </div>
                <label>
                  Reason
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} required />
                </label>
                <p className="inline-help">Requests are emailed to it.apply@chemvault.science.</p>
                <div className="mail-onboarding-actions">
                  <button className="secondary-button" type="button" onClick={continueToTarget} disabled={busy}>
                    Later
                  </button>
                  {sentMessage ? (
                    <button className="primary-button" type="button" onClick={continueToTarget}>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button className="primary-button" type="submit" disabled={busy}>
                      {busy ? <ButtonSpinner label="Sending..." /> : <><Send className="h-4 w-4" />Send request</>}
                    </button>
                  )}
                </div>
              </form>
            )}
          </>
        )}
      </section>
      <UserSystemFooter compact />
    </main>
  );
}
