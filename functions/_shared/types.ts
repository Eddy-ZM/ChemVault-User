export type UserRole = "free" | "pro" | "admin";
export type UserStatus = "active" | "disabled" | "deleted";
export type SystemRole = "user" | "staff" | "service_admin" | "admin" | "super_admin" | "owner";
export type UserSource = "local" | "mail_system" | "admin_created" | string;
export type GlobalStatus = "active" | "disabled" | "deleted" | string;
export type PermissionEffect = "allow" | "deny";
export type AccessStatus = "active" | "disabled" | "suspended";
export type MailRole = "mailbox_user" | "mailbox_admin" | "mailbox_super";
export type MailStatus = "active" | "disabled" | "suspended" | "deleted";

export interface Env {
  DB: D1Database;
  AVATARS?: R2Bucket;
  COOKIE_NAME?: string;
  JWT_SECRET?: string;
  MAIL_SYSTEM_SYNC_SECRET?: string;
  NODE_ENV?: string;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  avatar_url: string | null;
  institution: string | null;
  field_of_interest: string | null;
  bio: string | null;
  website: string | null;
  role: UserRole;
  system_role: SystemRole;
  source: UserSource;
  global_status: GlobalStatus;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface PublicUser {
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
  source: UserSource;
  globalStatus: GlobalStatus;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  permissions?: string[];
  services?: string[];
  pages?: string[];
  mailAccount?: PublicMailAccount | null;
}

export interface AuthContext {
  user: UserRow;
  sessionId: string;
  tokenHash: string;
}

export interface PermissionDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
}

export interface PermissionGrant {
  key: string;
  effect: PermissionEffect;
}

export interface AccessGrant {
  key: string;
  status: AccessStatus | string;
}

export interface AccessSnapshot {
  rolePermissions: PermissionGrant[];
  userPermissions: PermissionGrant[];
  services: AccessGrant[];
  pages: AccessGrant[];
}

export interface MailAccountRow {
  id: string;
  user_id: string;
  mail_address: string;
  mail_display_name: string | null;
  mail_role: MailRole;
  mail_status: MailStatus;
  can_send: number;
  can_receive: number;
  can_login_mail: number;
  mailbox_quota_mb: number;
  aliases: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicMailAccount {
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
}
