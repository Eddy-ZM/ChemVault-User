import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Fingerprint, KeyRound, Laptop, LogOut, Trash2, Unlink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import { passwordError } from "../lib/validators";
import { ConfirmDialog } from "../components/Modal";
import { useToast } from "../components/Toast";
import { ButtonSpinner, StatusBadge } from "../components/UiPrimitives";
import { AppleSignInButton } from "../components/AppleSignInButton";
import { OAuthSignInButton, type OAuthProvider } from "../components/OAuthSignInButton";

interface ExternalIdentity {
  provider: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  canUnlink?: boolean;
}

const accountProviders: Array<{
  key: "apple" | OAuthProvider;
  label: string;
  description: string;
}> = [
  {
    key: "apple",
    label: "Apple Account",
    description: "Use Apple Account sign-in with the existing ChemVault account.",
  },
  {
    key: "google",
    label: "Google",
    description: "Use Google OAuth with only openid, email, and profile scopes.",
  },
  {
    key: "github",
    label: "GitHub",
    description: "Use GitHub OAuth without repository permissions.",
  },
  {
    key: "microsoft",
    label: "Microsoft",
    description: "Use Microsoft identity platform sign-in with openid, email, profile, and User.Read scopes.",
  },
];

export function SecuritySettings() {
  const { notify } = useToast();
  const { logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [identities, setIdentities] = useState<ExternalIdentity[]>([]);
  const [unlinkingProvider, setUnlinkingProvider] = useState("");

  useEffect(() => {
    void loadExternalIdentities();
  }, []);

  useEffect(() => {
    const sso = searchParams.get("sso");
    if (searchParams.get("apple") === "linked" || sso?.endsWith("_linked")) {
      const provider = sso?.replace("_linked", "") || "apple";
      const label = accountProviders.find((item) => item.key === provider)?.label || "External account";
      setMessage(`${label} linked.`);
      notify({ title: `${label} linked`, description: `You can now sign in to this account with ${label}.`, tone: "success" });
      void loadExternalIdentities();
    }
  }, [notify, searchParams]);

  async function loadExternalIdentities() {
    try {
      const body = await apiRequest<{ identities: ExternalIdentity[] }>("/api/user/external-identities");
      setIdentities(body.identities);
    } catch {
      setIdentities([]);
    }
  }

  async function handleUnlink(provider: string) {
    setError("");
    setMessage("");
    try {
      setUnlinkingProvider(provider);
      await apiRequest<{ ok: true }>(`/api/user/external-identities/${provider}`, { method: "DELETE" });
      await loadExternalIdentities();
      const label = accountProviders.find((item) => item.key === provider)?.label || "External account";
      setMessage(`${label} unlinked.`);
      notify({ title: `${label} unlinked`, tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "External account unlink failed.";
      setError(message);
      notify({ title: "Unlink failed", description: message, tone: "error" });
    } finally {
      setUnlinkingProvider("");
    }
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const strength = passwordError(newPassword);

    if (strength) return setError(strength);
    if (newPassword !== confirmPassword) return setError("New passwords do not match.");

    try {
      setSavingPassword(true);
      await apiRequest<{ ok: true }>("/api/user/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      event.currentTarget.reset();
      setMessage("Password updated.");
      notify({ title: "Password updated", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Password update failed.";
      setError(message);
      notify({ title: "Password update failed", description: message, tone: "error" });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDelete() {
    if (deleteText !== "DELETE") return setError('Type "DELETE" before deleting the account.');

    try {
      setDeleting(true);
      await apiRequest<{ ok: true }>("/api/user/account", { method: "DELETE" });
      notify({ title: "Account deleted", tone: "warning" });
      setUser(null);
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Account delete failed.";
      setError(message);
      notify({ title: "Account delete failed", description: message, tone: "error" });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleLogoutAll() {
    setMessage("Logout all devices is reserved for the multi-session device UI.");
    notify({ title: "Coming soon", description: "Logout all devices is reserved for the multi-session device UI.", tone: "info" });
  }

  const identityByProvider = new Map(identities.map((identity) => [identity.provider, identity]));

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Security Settings</p>
          <h1>Account protection</h1>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <form className="settings-panel" onSubmit={handlePassword}>
          <div className="flex items-center gap-3">
            <div className="icon-tile">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-950">Change password</h2>
          </div>
          {message ? <div className="alert-success">{message}</div> : null}
          {error ? <div className="alert-error">{error}</div> : null}
          <label>
            Current password
            <input name="currentPassword" autoComplete="current-password" type={showPasswords ? "text" : "password"} required />
          </label>
          <label>
            New password
            <input name="newPassword" autoComplete="new-password" minLength={8} type={showPasswords ? "text" : "password"} required />
          </label>
          <label>
            Confirm new password
            <input name="confirmPassword" autoComplete="new-password" minLength={8} type={showPasswords ? "text" : "password"} required />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button" type="button" onClick={() => setShowPasswords((value) => !value)}>
              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPasswords ? "Hide passwords" : "Show passwords"}
            </button>
            <button className="primary-button" type="submit" disabled={savingPassword}>
              {savingPassword ? <ButtonSpinner label="Updating..." /> : "Update password"}
            </button>
          </div>
        </form>

        <div className="settings-panel">
          <div className="flex items-center gap-3">
            <div className="icon-tile">
              <Laptop className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-950">Current devices</h2>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-950">This browser</p>
            <p className="mt-1 text-sm text-slate-500">Device list UI is mocked until session device metadata is expanded.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="secondary-button" type="button" onClick={handleLogoutAll}>
              <LogOut className="h-4 w-4" />
              Logout all devices
            </button>
            <button className="secondary-button" type="button" onClick={logout}>
              Logout current session
            </button>
          </div>
        </div>
      </div>

      <div className="settings-panel">
        <div className="flex items-center gap-3">
          <div className="icon-tile">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Connected accounts</h2>
            <p className="text-sm text-slate-500">
              Bind third-party sign-in providers without changing ChemVault roles, permissions, or administrator status.
            </p>
          </div>
        </div>
        <div className="external-accounts-grid">
          {accountProviders.map((provider) => {
            const identity = identityByProvider.get(provider.key);
            return (
              <div className="external-identity-card" key={provider.key}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{provider.label}</p>
                    <StatusBadge value={identity ? "connected" : "not connected"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {identity ? `Linked as ${identity.email}` : provider.description}
                  </p>
                </div>
                {identity ? (
                  <button
                    className="secondary-button w-full sm:w-auto"
                    type="button"
                    onClick={() => void handleUnlink(provider.key)}
                    disabled={unlinkingProvider === provider.key || identity.canUnlink === false}
                    title={
                      identity.canUnlink === false
                        ? "Add a password or another provider before unlinking the last login method."
                        : `Unlink ${provider.label}`
                    }
                  >
                    {unlinkingProvider === provider.key ? (
                      <ButtonSpinner label="Unlinking..." />
                    ) : (
                      <>
                        <Unlink className="h-4 w-4" />
                        Unlink
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full sm:w-72">
                    {provider.key === "apple" ? (
                      <AppleSignInButton mode="link" returnTo="/settings/security?sso=apple_linked" label="Bind Apple Account" />
                    ) : (
                      <OAuthSignInButton
                        provider={provider.key}
                        mode="link"
                        returnTo={`/settings/security?sso=${provider.key}_linked`}
                        label={`Bind ${provider.label}`}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="danger-panel">
        <div>
          <h2>Delete account</h2>
          <p>Deletes this account after keeping one deletion audit record. Linked sign-in providers can create a fresh account later.</p>
        </div>
        <div className="flex flex-col gap-3 sm:min-w-[280px]">
          <input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder='Type "DELETE"' />
          <button className="danger-button justify-center" type="button" onClick={() => setConfirmDelete(true)} disabled={deleteText !== "DELETE"}>
            <Trash2 className="h-4 w-4" />
            Delete account
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this ChemVault account?"
        description="This keeps one deletion record, removes your account and linked sign-in methods, and signs out this browser."
        confirmLabel="Delete account"
        tone="danger"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
