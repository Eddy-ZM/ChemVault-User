import type { SystemRole } from "./types";
import {
  uomMailSystemFullAccessPermission,
  uomMailSystemPermission,
} from "./uomMailAccess";

export interface PermissionSeed {
  key: string;
  name: string;
  description: string;
  category: string;
}

export interface ServiceSeed {
  key: string;
  name: string;
}

export interface PageSeed {
  key: string;
  path: string;
  name: string;
}

export const serviceCatalog: ServiceSeed[] = [
  { key: "chemvault_main", name: "Main" },
  { key: "chemvault_app", name: "App" },
  { key: "chemvault_user", name: "User Center" },
  { key: "chemvault_file", name: "File" },
  { key: "chemvault_docs", name: "Docs" },
  { key: "chemvault_model", name: "Model" },
  { key: "chemvault_extract", name: "Extract" },
  { key: "chemvault_molecule", name: "Molecule" },
  { key: "chemvault_notif", name: "Notif" },
  { key: "chemvault_admin", name: "Admin" },
  { key: "chemvault_main_admin", name: "Main Site Admin" },
];

export const pageCatalog: PageSeed[] = [
  { key: "dashboard", path: "/dashboard", name: "Dashboard" },
  { key: "profile", path: "/settings/profile", name: "Profile" },
  { key: "security", path: "/settings/security", name: "Security" },
  { key: "plan", path: "/settings/plan", name: "Plan" },
  { key: "admin", path: "/admin", name: "Admin" },
  { key: "admin_users", path: "/admin/users", name: "Admin Users" },
  { key: "admin_permissions", path: "/admin/permissions", name: "Admin Permissions" },
  { key: "admin_mail", path: "/admin/mail", name: "Admin Mail" },
  { key: "admin_services", path: "/admin/services", name: "Admin Services" },
  { key: "admin_audit", path: "/admin/audit", name: "Admin Audit" },
  { key: "main_admin", path: "https://chemvault.science/admin", name: "Main Admin" },
  { key: "main_admin_forms", path: "https://chemvault.science/admin/forms", name: "Main Forms Admin" },
  { key: "main_admin_leads", path: "https://chemvault.science/admin/leads", name: "Main Leads Admin" },
  { key: "model", path: "/model", name: "Model" },
  { key: "file", path: "/file", name: "File" },
  { key: "docs", path: "/docs", name: "Docs" },
  { key: "extract", path: "/extract", name: "Extract" },
  { key: "molecule", path: "/molecule", name: "Molecule" },
  { key: "notif", path: "/notif", name: "Notif" },
];

const servicePermissions = [
  uomMailSystemPermission,
  "service:chemvault_main:access",
  "service:chemvault_app:access",
  "service:chemvault_user:access",
  "service:chemvault_file:access",
  "service:chemvault_docs:access",
  "service:chemvault_model:access",
  "service:chemvault_extract:access",
  "service:chemvault_molecule:access",
  "service:chemvault_notif:access",
  "service:chemvault_admin:access",
  "service:chemvault_main_admin:access",
];

const featurePermissions = [uomMailSystemFullAccessPermission];

const pagePermissions = [
  "page:dashboard:view",
  "page:profile:view",
  "page:profile:edit",
  "page:security:view",
  "page:security:edit",
  "page:plan:view",
  "page:admin:view",
  "page:admin_users:view",
  "page:admin_users:edit",
  "page:admin_permissions:view",
  "page:admin_permissions:edit",
  "page:admin_mail:view",
  "page:admin_mail:edit",
  "page:admin_services:view",
  "page:admin_services:edit",
  "page:admin_audit:view",
  "page:main_admin:view",
  "page:main_admin_forms:view",
  "page:main_admin_leads:view",
  "page:model:view",
  "page:file:view",
  "page:docs:view",
  "page:extract:view",
  "page:molecule:view",
  "page:notif:view",
];

const filePermissions = ["file:read", "file:upload", "file:delete", "file:share", "file:admin", "file:private_access", "file:public_manage"];
const docsPermissions = ["docs:read", "docs:create", "docs:edit", "docs:delete", "docs:publish", "docs:admin"];
const modelPermissions = ["model:view", "model:create", "model:edit", "model:delete", "model:run", "model:admin"];
const adminPermissions = [
  "admin:users:view",
  "admin:users:create",
  "admin:users:edit",
  "admin:users:disable",
  "admin:users:delete",
  "admin:permissions:view",
  "admin:permissions:edit",
  "admin:roles:edit",
  "admin:mail:view",
  "admin:mail:edit",
  "admin:services:view",
  "admin:services:edit",
  "admin:audit:view",
  "admin:system_settings:edit",
];
const mainAdminPermissions = [
  "main_admin:access",
  "main_admin:forms:read",
  "main_admin:forms:write",
  "main_admin:forms:reply",
  "main_admin:leads:read",
  "main_admin:leads:write",
  "main_admin:leads:notify",
  "main_admin:compliance:read",
  "main_admin:compliance:write",
];
const apiPermissions = ["api:read", "api:write", "api:admin", "api:key:create", "api:key:revoke"];

const categoryByPrefix: Record<string, string> = {
  service: "service",
  feature: "feature",
  page: "page",
  file: "file",
  docs: "docs",
  model: "model",
  admin: "admin",
  main_admin: "main_admin",
  api: "api",
};

export const permissionSeeds: PermissionSeed[] = [
  ...servicePermissions,
  ...featurePermissions,
  ...pagePermissions,
  ...filePermissions,
  ...docsPermissions,
  ...modelPermissions,
  ...adminPermissions,
  ...mainAdminPermissions,
  ...apiPermissions,
].map((key) => ({
  key,
  name: key === uomMailSystemPermission
    ? "University of Manchester Student Representative Mail System"
    : key === uomMailSystemFullAccessPermission
      ? "Access restriction"
      : key
        .split(":")
        .map((part) => part.replace(/_/g, " "))
        .join(" / "),
  description: key === uomMailSystemPermission
    ? "Allows the user to access the University of Manchester Student Representative Mail System and create official Student Representative announcements."
    : key === uomMailSystemFullAccessPermission
      ? "Deny restricts the principal workspace and all archive operations. Allow grants full service access. Public pages remain available in either state."
      : `Allows ${key}.`,
  category: categoryByPrefix[key.split(":")[0]] || "custom",
}));

export const defaultRolePermissions: Record<SystemRole, string[]> = {
  user: [
    "page:dashboard:view",
    "page:profile:view",
    "page:profile:edit",
    "page:security:view",
    "page:security:edit",
    "page:plan:view",
  ],
  staff: [
    "page:dashboard:view",
    "page:profile:view",
    "page:profile:edit",
    "page:security:view",
    "page:security:edit",
    "page:plan:view",
    "service:chemvault_docs:access",
    "service:chemvault_file:access",
    "docs:read",
    "file:read",
  ],
  service_admin: [
    "page:dashboard:view",
    "page:profile:view",
    "page:security:view",
    "page:plan:view",
  ],
  admin: [
    "page:dashboard:view",
    "page:profile:view",
    "page:profile:edit",
    "page:security:view",
    "page:security:edit",
    "page:plan:view",
    "page:admin:view",
    "page:admin_users:view",
    "page:admin_users:edit",
    "page:admin_permissions:view",
    "page:admin_permissions:edit",
    "page:admin_mail:view",
    "page:admin_mail:edit",
    "page:admin_services:view",
    "page:admin_services:edit",
    "page:admin_audit:view",
    "page:main_admin:view",
    "page:main_admin_forms:view",
    "page:main_admin_leads:view",
    "service:chemvault_admin:access",
    "service:chemvault_main_admin:access",
    "admin:users:view",
    "admin:users:create",
    "admin:users:edit",
    "admin:permissions:view",
    "admin:permissions:edit",
    "admin:mail:view",
    "admin:mail:edit",
    "admin:services:view",
    "admin:services:edit",
    "admin:audit:view",
    "main_admin:access",
    "main_admin:forms:read",
    "main_admin:forms:write",
    "main_admin:forms:reply",
    "main_admin:leads:read",
    "main_admin:leads:write",
    "main_admin:leads:notify",
    "main_admin:compliance:read",
    "main_admin:compliance:write",
  ],
  super_admin: [],
  owner: [],
};
