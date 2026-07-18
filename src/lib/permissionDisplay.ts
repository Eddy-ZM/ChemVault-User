import type { PermissionDefinition } from "./types";

interface CategoryDisplay {
  label: string;
  description: string;
  order: number;
}

export interface PermissionDisplay {
  title: string;
  summary: string;
  categoryLabel: string;
  categoryDescription: string;
}

export interface PermissionDependency {
  serviceKey: string;
  permissionKey: string;
  label: string;
}

const categories: Record<string, CategoryDisplay> = {
  service: {
    label: "Service Access",
    description: "Controls whether a user can enter a ChemVault service.",
    order: 10,
  },
  page: {
    label: "Page Access",
    description: "Controls visible pages and sections inside ChemVault products.",
    order: 20,
  },
  file: {
    label: "Files",
    description: "Controls file reading, upload, sharing, and file administration.",
    order: 30,
  },
  docs: {
    label: "Docs",
    description: "Controls document reading, editing, publishing, and documentation administration.",
    order: 40,
  },
  model: {
    label: "Model",
    description: "Controls model viewing, editing, execution, and model administration.",
    order: 50,
  },
  admin: {
    label: "Administration",
    description: "Controls user management, permission management, service settings, audit, and system settings.",
    order: 70,
  },
  main_admin: {
    label: "Main Site Admin",
    description: "Controls Forms, Leads, and compliance administration on chemvault.science.",
    order: 75,
  },
  api: {
    label: "API",
    description: "Controls API read/write access and API key lifecycle actions.",
    order: 80,
  },
  custom: {
    label: "Custom",
    description: "Custom permissions defined by ChemVault administrators.",
    order: 90,
  },
};

const actionLabels: Record<string, string> = {
  access: "Access",
  admin: "Administer",
  create: "Create",
  delete: "Delete",
  edit: "Edit",
  manage: "Manage",
  manage_alias: "Manage aliases for",
  manage_quota: "Manage quota for",
  private_access: "Access private",
  public_manage: "Manage public",
  publish: "Publish",
  read: "Read",
  receive: "Receive",
  revoke: "Revoke",
  run: "Run",
  send: "Send",
  share: "Share",
  upload: "Upload",
  view: "View",
  write: "Write",
};

const resourceLabels: Record<string, string> = {
  admin: "Admin Console",
  admin_audit: "Admin Audit",
  admin_mail: "Admin Mail",
  admin_permissions: "Admin Permissions",
  admin_services: "Admin Services",
  admin_users: "Admin Users",
  chemvault_admin: "Admin Console",
  chemvault_app: "ChemVault App",
  chemvault_docs: "ChemVault Docs",
  chemvault_extract: "ChemVault Extract",
  chemvault_file: "ChemVault Files",
  chemvault_mail: "ChemVault Mail",
  chemvault_main: "ChemVault Main Site",
  chemvault_main_admin: "ChemVault Main Site Admin",
  chemvault_model: "ChemVault Model",
  chemvault_molecule: "ChemVault Molecule",
  chemvault_notif: "ChemVault Notif",
  chemvault_user: "User Center",
  "uom-su-mail-system": "University of Manchester Student Representative Mail System",
  dashboard: "Dashboard",
  docs: "Docs",
  extract: "Extract",
  file: "Files",
  molecule: "Molecule",
  model: "Model",
  main_admin: "Main Admin",
  main_admin_forms: "Main Forms Admin",
  main_admin_leads: "Main Leads Admin",
  forms: "Forms",
  leads: "Leads",
  compliance: "Compliance",
  notif: "Notif",
  plan: "Plan",
  profile: "Profile",
  security: "Security",
};

const pageServiceMap: Record<string, string> = {
  admin: "chemvault_admin",
  admin_audit: "chemvault_admin",
  admin_mail: "chemvault_admin",
  admin_permissions: "chemvault_admin",
  admin_services: "chemvault_admin",
  admin_users: "chemvault_admin",
  main_admin: "chemvault_main_admin",
  main_admin_forms: "chemvault_main_admin",
  main_admin_leads: "chemvault_main_admin",
  dashboard: "chemvault_user",
  docs: "chemvault_docs",
  extract: "chemvault_extract",
  file: "chemvault_file",
  model: "chemvault_model",
  molecule: "chemvault_molecule",
  notif: "chemvault_notif",
  plan: "chemvault_user",
  profile: "chemvault_user",
  security: "chemvault_user",
};

const categoryServiceMap: Record<string, string> = {
  admin: "chemvault_admin",
  main_admin: "chemvault_main_admin",
  docs: "chemvault_docs",
  file: "chemvault_file",
  model: "chemvault_model",
};

export function getCategoryDisplay(category: string): CategoryDisplay {
  return categories[category] || {
    label: titleCase(category),
    description: "Custom permission category.",
    order: 200,
  };
}

export function sortPermissionCategories([left]: [string, PermissionDefinition[]], [right]: [string, PermissionDefinition[]]) {
  const leftDisplay = getCategoryDisplay(left);
  const rightDisplay = getCategoryDisplay(right);
  return leftDisplay.order - rightDisplay.order || leftDisplay.label.localeCompare(rightDisplay.label);
}

export function getPermissionDisplay(permission: PermissionDefinition): PermissionDisplay {
  const category = getCategoryDisplay(permission.category);
  const [area, resource = "", action = "access", extra = ""] = permission.key.split(":");
  const resourceName = toResourceName(resource || area);
  const actionName = toActionName(extra ? `${action}_${extra}` : action);
  const description = cleanDescription(permission);

  if (area === "service") {
    return {
      title: `Access ${resourceName}`,
      summary: description || `Lets the user enter ${resourceName}. Other page and feature permissions under this service are unusable without this access.`,
      categoryLabel: category.label,
      categoryDescription: category.description,
    };
  }

  if (area === "page") {
    return {
      title: `${actionName} ${resourceName} page`,
      summary: description || `Lets the user ${actionName.toLowerCase()} the ${resourceName} page after the required service access is also allowed.`,
      categoryLabel: category.label,
      categoryDescription: category.description,
    };
  }

  if (area === "admin") {
    return {
      title: `${actionName} ${resourceName}`,
      summary: description || `Allows administrative ${resourceName.toLowerCase()} ${actionName.toLowerCase()} actions after Admin Console access is allowed.`,
      categoryLabel: category.label,
      categoryDescription: category.description,
    };
  }

  if (area === "api" && resource === "key") {
    return {
      title: `${actionName} API keys`,
      summary: description || `Allows the user to ${actionName.toLowerCase()} API keys.`,
      categoryLabel: category.label,
      categoryDescription: category.description,
    };
  }

  return {
    title: `${actionName} ${resourceName}`,
    summary: description || `Allows ${actionName.toLowerCase()} actions for ${resourceName} after the required service access is also allowed.`,
    categoryLabel: category.label,
    categoryDescription: category.description,
  };
}

export function getPermissionDependency(permission: PermissionDefinition): PermissionDependency | null {
  const [area, resource = ""] = permission.key.split(":");
  if (area === "service") return null;

  const serviceKey =
    area === "page"
      ? pageServiceMap[resource]
      : categoryServiceMap[permission.category] || categoryServiceMap[area] || null;
  if (!serviceKey) return null;

  return {
    serviceKey,
    permissionKey: `service:${serviceKey}:access`,
    label: toResourceName(serviceKey),
  };
}

export function permissionSearchText(permission: PermissionDefinition): string {
  const display = getPermissionDisplay(permission);
  return `${permission.key} ${permission.name} ${permission.description || ""} ${display.title} ${display.summary} ${display.categoryLabel}`;
}

function toActionName(value: string): string {
  return actionLabels[value] || titleCase(value);
}

function toResourceName(value: string): string {
  if (resourceLabels[value]) return resourceLabels[value];
  const cleaned = value.replace(/^chemvault_/, "ChemVault ");
  return titleCase(cleaned);
}

function cleanDescription(permission: PermissionDefinition): string | null {
  const description = permission.description?.trim();
  if (!description) return null;
  const escapedKey = permission.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`^Allows\\s+${escapedKey}\\.?$`, "i").test(description)) return null;
  if (/^Allows\s+[a-z]+:[a-z0-9_:-]+\.?$/i.test(description)) return null;
  return description;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\bapi\b/gi, "API")
    .replace(/\bid\b/gi, "ID")
    .replace(/\bchemvault\b/gi, "ChemVault")
    .replace(/\bdocs\b/gi, "Docs")
    .replace(/\bnotif\b/gi, "Notif")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
