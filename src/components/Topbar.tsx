import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { UserAvatar } from "./UserAvatar";

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar">
      <div>
        <p className="label">ChemVault User Center</p>
        <h1 className="text-2xl font-semibold tracking-[0] text-slate-950">Unified account workspace</h1>
      </div>
      <div className="flex items-center gap-3">
        <UserAvatar user={user} size="sm" />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-950">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <button className="icon-button" onClick={handleLogout} type="button" aria-label="Log out" title="Log out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
