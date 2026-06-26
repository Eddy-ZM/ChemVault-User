import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Landing } from "./routes/Landing";
import { Login } from "./routes/Login";
import { Register } from "./routes/Register";
import { Dashboard } from "./routes/Dashboard";
import { ProfileSettings } from "./routes/ProfileSettings";
import { SecuritySettings } from "./routes/SecuritySettings";
import { PlanSettings } from "./routes/PlanSettings";
import { ConnectedServices } from "./routes/ConnectedServices";
import { AdminPanel } from "./routes/AdminPanel";
import { UserManagement } from "./routes/UserManagement";
import { UserDetail } from "./routes/UserDetail";
import { PermissionCenter } from "./routes/PermissionCenter";
import { UserPermissionEditor } from "./routes/UserPermissionEditor";
import { ServiceAccessEditor } from "./routes/ServiceAccessEditor";
import { PageAccessEditor } from "./routes/PageAccessEditor";
import { MailAccountManager } from "./routes/MailAccountManager";
import { MailSync } from "./routes/MailSync";
import { ToastProvider } from "./components/Toast";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/services" element={<ConnectedServices />} />
                <Route path="/settings/profile" element={<ProfileSettings />} />
                <Route path="/settings/security" element={<SecuritySettings />} />
                <Route path="/settings/plan" element={<PlanSettings />} />
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                  <Route path="/admin/users/:id" element={<UserDetail />} />
                  <Route path="/admin/users/:id/permissions" element={<UserPermissionEditor />} />
                  <Route path="/admin/users/:id/services" element={<ServiceAccessEditor />} />
                  <Route path="/admin/users/:id/pages" element={<PageAccessEditor />} />
                  <Route path="/admin/permissions" element={<PermissionCenter />} />
                  <Route path="/admin/mail" element={<MailAccountManager />} />
                  <Route path="/admin/mail-sync" element={<MailSync />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
