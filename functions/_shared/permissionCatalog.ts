import type { SystemRole } from "./types";

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
  { key: "model", path: "/model", name: "Model" },
  { key: "file", path: "/file", name: "File" },
  { key: "docs", path: "/docs", name: "Docs" },
  { key: "extract", path: "/extract", name: "Extract" },
  { key: "molecule", path: "/molecule", name: "Molecule" },
  { key: "notif", path: "/notif", name: "Notif" },
];

const servicePermissions = [
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
];

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
const apiPermissions = ["api:read", "api:write", "api:admin", "api:key:create", "api:key:revoke"];

const categoryByPrefix: Record<string, string> = {
  service: "service",
  page: "page",
  file: "file",
  docs: "docs",
  model: "model",
  admin: "admin",
  api: "api",
};

export const permissionSeeds: PermissionSeed[] = [
  ...servicePermissions,
  ...pagePermissions,
  ...filePermissions,
  ...docsPermissions,
  ...modelPermissions,
  ...adminPermissions,
  ...apiPermissions,
].map((key) => ({
  key,
  name: key
    .split(":")
    .map((part) => part.replace(/_/g, " "))
    .join(" / "),
  description: `Allows ${key}.`,
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
    "service:chemvault_admin:access",
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
  ],
  super_admin: [],
  owner: [],
};
