import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label">{label}</p>
          <strong className="mt-2 block text-2xl font-semibold text-slate-950">{value}</strong>
          {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
        </div>
        <div className="icon-tile">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}
