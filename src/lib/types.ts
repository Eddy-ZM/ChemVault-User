export type UserRole = "free" | "pro" | "admin";
export type UserStatus = "active" | "disabled" | "deleted";
export type SystemRole = "user" | "staff" | "service_admin" | "admin" | "super_admin" | "owner";
export type AccessStatus = "active" | "disabled" | "suspended";
export type PermissionEffect = "allow" | "deny";
export type MailRole = "mailbox_user" | "mailbox_admin" | "mailbox_super";
export type MailStatus = "active" | "disabled" | "suspended" | "deleted";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  institution: string | null;
  fieldOfInterest: string | null;
  bio: string | null;
  website: string | null;
  role: UserRole;
  systemRole: SystemRole;
  source: string;
  globalStatus: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  permissions?: string[];
  services?: string[];
  pages?: string[];
  mailAccount?: MailAccount | null;
  mailAddress?: string | null;
  mailStatus?: MailStatus | string | null;
}

export interface UsageResponse {
  summary: {
    aiExtractionCreditsUsed: number;
    storageUsedMb: number;
    apiRequestsThisMonth: number;
  };
  limits: {
    aiCredits: number;
    storageMb: number;
    apiRequests: number;
  };
}

export interface ConnectedService {
  service: string;
  name: string;
  description: string;
  status: "active" | "not_connected" | "coming_soon" | string;
  connectedAt: string | null;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  proUsers: number;
  adminUsers: number;
  superAdminUsers: number;
  ownerUsers: number;
  usersWithMailAccounts: number;
  enabledServicesCount: number;
  storageUsageMb: number;
  recentAuditLogs: AuditLog[];
  mailAdminSyncStatus: { lastSyncedAt: string; details: unknown } | null;
}

export interface PermissionDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  createdAt?: string;
  created_at?: string;
}

export interface PermissionGrant {
  key: string;
  effect: PermissionEffect;
}

export interface ServiceAccess {
  serviceKey: string;
  status: AccessStatus | string;
}

export interface PageAccess {
  pageKey: string;
  status: AccessStatus | string;
}

export interface CatalogEntry {
  key: string;
  name: string;
  path?: string;
}

export interface MailAccount {
  id: string;
  userId: string;
  mailAddress: string;
  displayName: string | null;
  mailRole: MailRole;
  mailStatus: MailStatus;
  canSend: boolean;
  canReceive: boolean;
  canLoginMail: boolean;
  mailboxQuotaMb: number;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
  user?: { email: string; name: string | null } | null;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: unknown;
  createdAt: string;
}
