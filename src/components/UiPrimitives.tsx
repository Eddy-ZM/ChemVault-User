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
    <div className="grid min-h-[220px] place-items-center content-center gap-3 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-cyan-700" />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
    </div>
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
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-700 shadow-card backdrop-blur">
      <span>{dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}</span>
      <button className="secondary-button h-9" type="button" onClick={onReset} disabled={saving}>
        Reset
      </button>
      <button className="primary-button h-9" type="button" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
