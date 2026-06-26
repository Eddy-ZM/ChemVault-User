import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, Laptop, LogOut, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import { passwordError } from "../lib/validators";
import { ConfirmDialog } from "../components/Modal";
import { useToast } from "../components/Toast";

export function SecuritySettings() {
  const { notify } = useToast();
  const { logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
              {savingPassword ? "Updating..." : "Update password"}
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

      <div className="danger-panel">
        <div>
          <h2>Delete account</h2>
          <p>Soft deletes the user by setting status to deleted, revokes sessions, and keeps audit-friendly records.</p>
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
        description="This is a soft delete, but it immediately signs you out and blocks future login until an administrator restores the account."
        confirmLabel="Delete account"
        tone="danger"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
