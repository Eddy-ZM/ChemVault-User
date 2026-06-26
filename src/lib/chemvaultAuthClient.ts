import { apiRequest } from "./api";
import type { User } from "./types";

const userCenterOrigin = import.meta.env.VITE_CHEMVAULT_USER_ORIGIN || "";

function userCenterPath(path: string): string {
  return `${userCenterOrigin}${path}`;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const body = await apiRequest<{ user: User }>(userCenterPath("/api/auth/me"));
    return body.user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("ChemVault authentication is required.");
  return user;
}

export async function getUserPermissions(): Promise<string[]> {
  const user = await requireUser();
  return user.permissions || [];
}

async function checkAccess(query: Record<string, string>): Promise<{ allowed: boolean; reason: string; user?: Pick<User, "id" | "email" | "systemRole"> }> {
  const params = new URLSearchParams(query);
  return apiRequest<{ allowed: boolean; reason: string; user?: Pick<User, "id" | "email" | "systemRole"> }>(
    userCenterPath(`/api/access/check?${params.toString()}`),
  );
}

export async function checkPermission(permissionKey: string): Promise<boolean> {
  const result = await checkAccess({ permission: permissionKey });
  return result.allowed;
}

export async function checkServiceAccess(serviceKey: string): Promise<boolean> {
  const result = await checkAccess({ service: serviceKey });
  return result.allowed;
}

export async function checkPageAccess(pageKey: string): Promise<boolean> {
  const result = await checkAccess({ page: pageKey });
  return result.allowed;
}

export async function requirePermission(permissionKey: string): Promise<void> {
  const allowed = await checkPermission(permissionKey);
  if (!allowed) throw new Error(`Missing ChemVault permission: ${permissionKey}`);
}

export async function requireServiceAccess(serviceKey: string): Promise<void> {
  const allowed = await checkServiceAccess(serviceKey);
  if (!allowed) throw new Error(`Missing ChemVault service access: ${serviceKey}`);
}

export async function requirePageAccess(pageKey: string): Promise<void> {
  const allowed = await checkPageAccess(pageKey);
  if (!allowed) throw new Error(`Missing ChemVault page access: ${pageKey}`);
}

export async function logout(): Promise<void> {
  await apiRequest<{ ok: true }>(userCenterPath("/api/auth/logout"), { method: "POST" });
}

export function getAuthHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-ChemVault-Auth-Mode": "cookie",
  };
}
