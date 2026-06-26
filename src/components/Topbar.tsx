import { LogOut, Menu, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { UserAvatar } from "./UserAvatar";
import { ConfirmDialog } from "./Modal";
import { useToast } from "./Toast";

export function Topbar({ onMenu, onCommand }: { onMenu: () => void; onCommand: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  if (!user) return null;

  async function handleLogout() {
    await logout();
    notify({ title: "Signed out", tone: "info" });
    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar">
      <div className="flex min-w-0 items-center gap-3">
        <button className="icon-button lg:hidden" type="button" onClick={onMenu} aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
        <p className="label">ChemVault User Center</p>
        <h1 className="truncate text-xl font-semibold tracking-[0] text-slate-950 sm:text-2xl">Unified account workspace</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button className="secondary-button hidden h-10 sm:inline-flex" type="button" onClick={onCommand}>
          <Search className="h-4 w-4" />
          Search
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">⌘K</span>
        </button>
        <button className="icon-button sm:hidden" type="button" onClick={onCommand} aria-label="Open command center">
          <Search className="h-4 w-4" />
        </button>
        <div className="relative">
          <button className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-1.5 pr-3 transition hover:border-cyan-200" type="button" onClick={() => setMenuOpen((value) => !value)}>
            <UserAvatar user={user} size="sm" />
            <div className="hidden text-left sm:block">
              <p className="max-w-[170px] truncate text-sm font-semibold text-slate-950">{user.name}</p>
              <p className="max-w-[170px] truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-card">
              <div className="border-b border-slate-100 p-3">
                <p className="text-sm font-semibold text-slate-950">{user.name}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{user.email}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-cyan-700">{user.systemRole.replace(/_/g, " ")}</p>
              </div>
              <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50" type="button" onClick={() => { setMenuOpen(false); navigate("/settings/profile"); }}>
                <UserRound className="h-4 w-4" />
                Profile settings
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50" type="button" onClick={() => { setMenuOpen(false); setConfirmLogout(true); }}>
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={confirmLogout}
        title="Log out of ChemVault?"
        description="Your current browser session will be ended."
        confirmLabel="Logout"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => void handleLogout()}
      />
    </header>
  );
}
