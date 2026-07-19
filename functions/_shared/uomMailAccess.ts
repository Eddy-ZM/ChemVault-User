export const uomMailSystemPermission = "service:uom-su-mail-system:access" as const;
export const uomMailSystemFullAccessPermission = "feature:uom-su-mail-system:full_access" as const;
export const uomMailSystemServiceKey = "uom-su-mail-system" as const;
export const uomMailSystemPermissions = [
  uomMailSystemPermission,
  uomMailSystemFullAccessPermission,
] as const;
export const uomMailSystemBootstrapEmails = [
  "ziwen.mu@chemvault.science",
  "test@chemvault.science",
] as const;

export function isUomMailSystemPermission(permissionKey: string): boolean {
  return uomMailSystemPermissions.some((key) => key === permissionKey);
}

export function isUomMailSystemServiceKey(serviceKey: string): boolean {
  return serviceKey === uomMailSystemServiceKey;
}

export function isUomMailSystemBootstrapUser(user: { email: string }): boolean {
  const normalizedEmail = user.email.trim().toLowerCase();
  return uomMailSystemBootstrapEmails.some((email) => email === normalizedEmail);
}
