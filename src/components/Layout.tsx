import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Topbar />
        <Outlet />
      </main>
    </div>
  );
}
