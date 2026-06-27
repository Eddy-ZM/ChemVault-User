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
  mail: {
    label: "Mail",
    description: "Controls mailbox access, sending, receiving, aliases, quota, and mail administration.",
    order: 60,
  },
  admin: {
    label: "Administration",
    description: "Controls user management, permission management, service settings, audit, and system settings.",
    order: 70,
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

  if (area === "service") {
    return {
      title: `Access ${resourceName}`,
      summary: permission.description || `Lets the user open and use ${resourceName}.`,
      categoryLabel: category.label,
      categoryDescription: category.description,
    };
  }

  if (area === "page") {
    return {
      title: `${actionName} ${resourceName} page`,
      summary: permission.description || `Lets the user ${actionName.toLowerCase()} the ${resourceName} page.`,
      categoryLabel: category.label,
      categoryDescription: category.description,
    };
  }

  if (area === "admin") {
    return {
      title: `${actionName} ${resourceName}`,
      summary: permission.description || `Allows administrative ${resourceName.toLowerCase()} ${actionName.toLowerCase()} actions.`,
      categoryLabel: category.label,
      categoryDescription: category.description,
    };
  }

  if (area === "api" && resource === "key") {
    return {
      title: `${actionName} API keys`,
      summary: permission.description || `Allows the user to ${actionName.toLowerCase()} API keys.`,
      categoryLabel: category.label,
      categoryDescription: category.description,
    };
  }

  return {
    title: `${actionName} ${resourceName}`,
    summary: permission.description || `Allows ${actionName.toLowerCase()} actions for ${resourceName}.`,
    categoryLabel: category.label,
    categoryDescription: category.description,
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
  const cleaned = value.replace(/^chemvault_/, "ChemVault ");
  return titleCase(cleaned);
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
