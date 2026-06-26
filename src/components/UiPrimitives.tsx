import { Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { AccessStatus, MailStatus, PermissionEffect, SystemRole, UserRole, UserStatus } from "../lib/types";

type StatusValue = AccessStatus | MailStatus | UserStatus | UserRole | SystemRole | PermissionEffect | string | null | undefined;

export function StatusBadge({ value }: { value: StatusValue }) {
  const normalized = String(value || "unknown");
  const className =
    normalized === "active" || normalized === "allow" || normalized === "pro"
      ? "status-active"
      : normalized === "disabled" || normalized === "deleted" || normalized === "deny"
        ? "status-danger"
        : normalized === "suspended" || normalized === "admin" || normalized === "super_admin" || normalized === "owner"
          ? "status-soon"
          : "status-idle";

  return <span className={`status-pill ${className}`}>{normalized.replace(/_/g, " ")}</span>;
}

export function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="loading-block">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <Loader2 className="h-5 w-5 animate-spin text-cyan-700" />
      </div>
      <p>{label}</p>
      <div className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function ButtonSpinner({ label = "Working..." }: { label?: string }) {
  return (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Inbox className="h-8 w-8 text-cyan-700" />
      <h1>{title}</h1>
      <p>{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function SaveBar({
  dirtyCount,
  saving,
  onReset,
  onSave,
}: {
  dirtyCount: number;
  saving?: boolean;
  onReset: () => void;
  onSave: () => void;
}) {
  if (!dirtyCount) return null;

  return (
    <div className="save-bar">
      <span>{dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}</span>
      <button className="secondary-button h-9" type="button" onClick={onReset} disabled={saving}>
        Reset
      </button>
      <button className="primary-button h-9" type="button" onClick={onSave} disabled={saving}>
        {saving ? <ButtonSpinner label="Saving..." /> : "Save changes"}
      </button>
    </div>
  );
}
