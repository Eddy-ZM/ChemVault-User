import { ApiError } from "./responses";
import type { MailRole, SystemRole, UserRole, UserRow, UserStatus } from "./types";
import {
  cleanOptionalText,
  normalizeEmail,
  validateEmail,
  validateMailRole,
  validatePasswordStrength,
  validateRole,
  validateStatus,
  validateSystemRole,
} from "./validators";

export interface AdminCreateMailboxPayload {
  mailAddress: string;
  displayName: string | null;
  mailRole: MailRole;
  canSend: boolean;
  canReceive: boolean;
  canLoginMail: boolean;
  mailboxQuotaMb: number;
  aliases: string[];
}

export interface AdminCreateUserPayload {
  name: string;
  email: string;
  password: string | null;
  institution: string | null;
  fieldOfInterest: string | null;
  role: UserRole;
  systemRole: SystemRole;
  status: UserStatus;
  assignMailbox: boolean;
  mailAccount: AdminCreateMailboxPayload | null;
}

export function parseAdminCreateUserPayload(input: unknown): AdminCreateUserPayload {
  const payload = input as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 160) : "";
  const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const role = validateRole(payload.role || "free");
  const systemRole = validateSystemRole(payload.systemRole || "user");
  const status = validateStatus(payload.status || "active");
  const assignMailbox = Boolean(payload.assignMailbox || payload.mailAccount);

  if (!name) throw new ApiError("VALIDATION_ERROR", "Name is required.", 400);
  if (!validateEmail(email)) throw new ApiError("VALIDATION_ERROR", "A valid email is required.", 400);
  if (status === "deleted") throw new ApiError("VALIDATION_ERROR", "New users cannot be created as deleted.", 400);

  if (password) {
    const result = validatePasswordStrength(password);
    if (!result.ok) throw new ApiError("VALIDATION_ERROR", result.message, 400);
  }

  return {
    name,
    email,
    password: password || null,
    institution: cleanOptionalText(payload.institution, 180),
    fieldOfInterest: cleanOptionalText(payload.fieldOfInterest, 120),
    role,
    systemRole,
    status,
    assignMailbox,
    mailAccount: assignMailbox ? parseCreateMailboxPayload(payload.mailAccount, name) : null,
  };
}

export function assertActorCanCreateSystemRole(actor: UserRow, systemRole: SystemRole): void {
  const actorIsOwner = actor.system_role === "owner";
  const actorIsSuper = actor.system_role === "super_admin" || actorIsOwner;

  if (systemRole === "owner" && !actorIsOwner) {
    throw new ApiError("FORBIDDEN", "Only owner accounts can create owner accounts.", 403);
  }

  if (systemRole === "super_admin" && !actorIsSuper) {
    throw new ApiError("FORBIDDEN", "Only super admin or owner accounts can create super admin accounts.", 403);
  }
}

function parseCreateMailboxPayload(input: unknown, fallbackDisplayName: string): AdminCreateMailboxPayload {
  const payload = input as Record<string, unknown>;
  const mailAddress = typeof payload.mailAddress === "string" ? normalizeEmail(payload.mailAddress) : "";
  const displayName =
    typeof payload.displayName === "string" ? payload.displayName.trim().slice(0, 160) || fallbackDisplayName : fallbackDisplayName;
  const mailboxQuotaMb = Number(payload.mailboxQuotaMb ?? 1024);

  if (!validateEmail(mailAddress)) throw new ApiError("VALIDATION_ERROR", "A valid mailbox address is required.", 400);
  if (!Number.isInteger(mailboxQuotaMb) || mailboxQuotaMb < 0) {
    throw new ApiError("VALIDATION_ERROR", "Mailbox quota must be a non-negative integer.", 400);
  }

  return {
    mailAddress,
    displayName,
    mailRole: validateMailRole(payload.mailRole || "mailbox_user"),
    canSend: boolValue(payload.canSend, true),
    canReceive: boolValue(payload.canReceive, true),
    canLoginMail: boolValue(payload.canLoginMail, true),
    mailboxQuotaMb,
    aliases: parseAliases(payload.aliases),
  };
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeEmail(item))
    .filter((item) => validateEmail(item))
    .slice(0, 20);
}
