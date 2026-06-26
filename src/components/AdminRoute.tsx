import { ShieldAlert } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function AdminRoute() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || ["admin", "super_admin", "owner"].includes(user?.systemRole || "");

  if (!isAdmin) {
    return (
      <section className="page-section">
        <div className="empty-state">
          <ShieldAlert className="h-8 w-8 text-amber-600" />
          <h1>403 Forbidden</h1>
          <p>This area is limited to ChemVault administrators.</p>
        </div>
      </section>
    );
  }

  return <Outlet />;
}
