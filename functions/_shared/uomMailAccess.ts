export const uomMailSystemPermission = "service:uom-su-mail-system:access" as const;
export const uomMailSystemServiceKey = "uom-su-mail-system" as const;
export const uomMailSystemBootstrapEmail = "ziwen.mu@chemvault.science" as const;

export function isUomMailSystemPermission(permissionKey: string): boolean {
  return permissionKey === uomMailSystemPermission;
}

export function isUomMailSystemServiceKey(serviceKey: string): boolean {
  return serviceKey === uomMailSystemServiceKey;
}

export function isUomMailSystemBootstrapUser(user: { email: string }): boolean {
  return user.email.trim().toLowerCase() === uomMailSystemBootstrapEmail;
}
