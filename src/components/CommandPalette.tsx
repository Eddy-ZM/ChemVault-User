import { useEffect, useMemo, useState } from "react";
import { CreditCard, KeyRound, LayoutDashboard, LockKeyhole, Mail, Network, Search, Shield, UserRound, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Modal } from "./Modal";
import { useAuth } from "../lib/auth";

const baseCommands = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, keywords: "home usage services" },
  { label: "Profile settings", path: "/settings/profile", icon: UserRound, keywords: "name avatar institution bio" },
  { label: "Security settings", path: "/settings/security", icon: LockKeyhole, keywords: "password devices delete account" },
  { label: "Plan settings", path: "/settings/plan", icon: CreditCard, keywords: "billing subscription stripe" },
  { label: "Connected services", path: "/services", icon: Network, keywords: "access product extract files molecule notif" },
];

const adminCommands = [
  { label: "Admin dashboard", path: "/admin", icon: Shield, keywords: "stats audit console" },
  { label: "User management", path: "/admin/users", icon: UsersRound, keywords: "roles status users" },
  { label: "Permission center", path: "/admin/permissions", icon: KeyRound, keywords: "permissions policies grants" },
  { label: "Mail accounts", path: "/admin/mail", icon: Mail, keywords: "mailbox alias quota send receive" },
  { label: "Mail admin sync", path: "/admin/mail-sync", icon: Mail, keywords: "super admin import mail system" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const isAdmin = user?.role === "admin" || ["admin", "super_admin", "owner"].includes(user?.systemRole || "");
  const commands = isAdmin ? [...baseCommands, ...adminCommands] : baseCommands;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) => `${command.label} ${command.keywords}`.toLowerCase().includes(needle));
  }, [commands, query]);

  function select(path: string) {
    navigate(path);
    onOpenChange(false);
  }

  return (
    <Modal open={open} title="Command center" description="Search pages and admin tools." onClose={() => onOpenChange(false)} size="md">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
        Search
        <input className="pl-9" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="users, permissions, mail..." />
      </label>
      <div className="mt-4 grid gap-2">
        {filtered.map((command) => (
          <button
            key={command.path}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50"
            type="button"
            onClick={() => select(command.path)}
          >
            <span className="icon-tile h-9 w-9">
              <command.icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-950">{command.label}</span>
              <span className="block text-xs text-slate-500">{command.path}</span>
            </span>
          </button>
        ))}
        {!filtered.length ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No command matches your search.</p> : null}
      </div>
    </Modal>
  );
}
