import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export function Modal({ open, title, description, onClose, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className={`max-h-[calc(100vh-2rem)] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card ${sizeClass[size]}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button className="icon-button h-9 w-9" type="button" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-13rem)] overflow-auto p-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={busy ? () => undefined : onCancel}
      size="sm"
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button className={tone === "danger" ? "danger-button" : "primary-button"} type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className={tone === "danger" ? "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" : "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"}>
        {description}
      </div>
    </Modal>
  );
}
