import { BarChart3, CreditCard, KeyRound, LayoutDashboard, LockKeyhole, Mail, Network, Shield, UserRound, UsersRound } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import { BrandLogo } from "./BrandLogo";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/settings/profile", label: "Profile", icon: UserRound },
  { to: "/settings/security", label: "Security", icon: LockKeyhole },
  { to: "/settings/plan", label: "Plan", icon: CreditCard },
  { to: "/services", label: "Connected Services", icon: Network },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin" || ["admin", "super_admin", "owner"].includes(user?.systemRole || "");

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  return (
    <>
      <button
        className={`fixed inset-0 z-20 bg-slate-950/30 transition lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <NavLink to="/dashboard" className="no-underline">
        <BrandLogo />
      </NavLink>
      <nav className="mt-5 grid gap-2 overflow-y-auto pb-1 lg:mt-7 lg:overflow-visible lg:pb-0">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
        {isAdmin ? (
          <>
          <NavLink end to="/admin" className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
            <Shield className="h-4 w-4" />
            Admin
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
            <UsersRound className="h-4 w-4" />
            Users
          </NavLink>
          <NavLink to="/admin/permissions" className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
            <KeyRound className="h-4 w-4" />
            Permissions
          </NavLink>
          <NavLink to="/admin/mail" className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
            <Mail className="h-4 w-4" />
            Mail
          </NavLink>
          <NavLink to="/admin/mail-sync" className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
            <Mail className="h-4 w-4" />
            Mail Sync
          </NavLink>
          </>
        ) : null}
      </nav>
      <div className="mt-auto hidden rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 lg:block">
        <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <BarChart3 className="h-4 w-4 text-cyan-700" />
          Account fabric
        </div>
        Shared identity for app, files, extraction, molecule, and notifications.
      </div>
    </aside>
    </>
  );
}
