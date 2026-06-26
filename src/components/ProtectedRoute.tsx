import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-500">Loading ChemVault account...</div>;
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}
