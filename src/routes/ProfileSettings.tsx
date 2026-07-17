import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { RotateCcw, Save, Upload } from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { ApiClientError, apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { User } from "../lib/types";
import { useToast } from "../components/Toast";
import { ButtonSpinner } from "../components/UiPrimitives";
import { ConfirmDialog } from "../components/Modal";

export function ProfileSettings() {
  const { notify } = useToast();
  const { user, setUser } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmClearAvatar, setConfirmClearAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarPreview(user?.avatarUrl || null);
  }, [user?.avatarUrl]);

  if (!user) return null;

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  function clearAvatarPreview() {
    setAvatarPreview(null);
    setConfirmClearAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
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
          website: String(form.get("website") || ""),
          // TODO: Replace this base64/mock avatarUrl with R2 upload once the AVATARS bucket URL policy is finalized.
          avatarUrl: avatarPreview,
        }),
      });
      setUser(body.user);
      setMessage("Profile updated.");
      notify({ title: "Profile updated", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Profile update failed.";
      setError(message);
      notify({ title: "Profile update failed", description: message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Profile Settings</p>
          <h1>Research identity</h1>
        </div>
      </div>
      <form className="settings-panel" onSubmit={handleSubmit}>
        {message ? <div className="alert-success">{message}</div> : null}
        {error ? <div className="alert-error">{error}</div> : null}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar user={{ ...user, avatarUrl: avatarPreview }} size="lg" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Avatar</h2>
              <p className="text-sm text-slate-500">Preview your profile image before saving it to your ChemVault account.</p>
            </div>
          </div>
          <label className="secondary-button cursor-pointer">
            <Upload className="h-4 w-4" />
            Upload
            <input ref={avatarInputRef} className="sr-only" accept="image/*" type="file" onChange={handleAvatar} />
          </label>
          <button className="secondary-button" type="button" onClick={() => setConfirmClearAvatar(true)} disabled={!avatarPreview}>
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <div className="form-grid">
          <label>
            Display name
            <input name="name" defaultValue={user.name} required />
          </label>
          <label>
            Institution
            <input name="institution" defaultValue={user.institution || ""} />
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
          <label>
            Website / GitHub link
            <input name="website" defaultValue={user.website || ""} placeholder="https://github.com/..." />
          </label>
        </div>
        <label>
          Bio
          <textarea name="bio" defaultValue={user.bio || ""} rows={5} />
        </label>
        <button className="primary-button w-fit" type="submit" disabled={saving}>
          {saving ? (
            <ButtonSpinner label="Saving..." />
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save profile
            </>
          )}
        </button>
      </form>
      <ConfirmDialog
        open={confirmClearAvatar}
        title="Clear profile avatar?"
        description="This will remove the current avatar preview. The change is applied to your account after you save the profile."
        confirmLabel="Clear avatar"
        tone="danger"
        onCancel={() => setConfirmClearAvatar(false)}
        onConfirm={clearAvatarPreview}
      />
    </section>
  );
}
