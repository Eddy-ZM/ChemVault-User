import { ApiError } from "./responses";
import type { AccessStatus, MailRole, MailStatus, PermissionEffect, SystemRole, UserRole, UserStatus } from "./types";

type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  institution?: string | null;
  fieldOfInterest?: string | null;
  turnstileToken?: string | null;
}

export interface ProfilePayload {
  name?: string;
  institution?: string | null;
  fieldOfInterest?: string | null;
  bio?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function cleanOptionalText(value: unknown, maxLength = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePasswordStrength(password: string): { ok: true } | { ok: false; message: string } {
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  return { ok: true };
}

export function validateRegisterPayload(input: unknown): ValidationResult<RegisterPayload> {
  const payload = input as Partial<RegisterPayload>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const passwordResult = validatePasswordStrength(password);

  if (!name) return { ok: false, message: "Name is required." };
  if (!validateEmail(email)) return { ok: false, message: "A valid email is required." };
  if (!passwordResult.ok) return passwordResult;

  return {
    ok: true,
    value: {
      name: name.slice(0, 160),
      email,
      password,
      institution: cleanOptionalText(payload.institution, 180),
      fieldOfInterest: cleanOptionalText(payload.fieldOfInterest, 120),
      turnstileToken: cleanOptionalText(payload.turnstileToken, 4096),
    },
  };
}

export function requireValidRegisterPayload(input: unknown): RegisterPayload {
  const result = validateRegisterPayload(input);
  if (!result.ok) throw new ApiError("VALIDATION_ERROR", result.message, 400);
  return result.value;
}

export function validateLoginPayload(input: unknown): { email: string; password: string } {
  const payload = input as { email?: unknown; password?: unknown };
  const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!validateEmail(email) || !password) {
    throw new ApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }

  return { email, password };
}

export function validateProfilePayload(input: unknown): ProfilePayload {
  const payload = input as ProfilePayload;
  const updates: ProfilePayload = {};

  if (Object.hasOwn(payload, "name")) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) throw new ApiError("VALIDATION_ERROR", "Display name is required.", 400);
    updates.name = name.slice(0, 160);
  }

  if (Object.hasOwn(payload, "institution")) updates.institution = cleanOptionalText(payload.institution, 180);
  if (Object.hasOwn(payload, "fieldOfInterest")) {
    updates.fieldOfInterest = cleanOptionalText(payload.fieldOfInterest, 120);
  }
  if (Object.hasOwn(payload, "bio")) updates.bio = cleanOptionalText(payload.bio, 1000);
  if (Object.hasOwn(payload, "avatarUrl")) updates.avatarUrl = cleanOptionalText(payload.avatarUrl, 250000);

  if (Object.hasOwn(payload, "website")) {
    const website = cleanOptionalText(payload.website, 240);
    if (website && !/^https?:\/\/[^\s]+$/i.test(website)) {
      throw new ApiError("VALIDATION_ERROR", "Website must be a valid http or https URL.", 400);
    }
    updates.website = website;
  }

  if (!Object.keys(updates).length) {
    throw new ApiError("VALIDATION_ERROR", "No profile fields were provided.", 400);
  }

  return updates;
}

export function validateRole(role: unknown): UserRole {
  if (role === "free" || role === "pro" || role === "admin") return role;
  throw new ApiError("VALIDATION_ERROR", "Role must be free, pro, or admin.", 400);
}

export function validateStatus(status: unknown): UserStatus {
  if (status === "active" || status === "suspended" || status === "deletion_pending" || status === "disabled" || status === "deleted") return status;
  throw new ApiError("VALIDATION_ERROR", "Status must be active, suspended, deletion_pending, disabled, or deleted.", 400);
}

export function validateSystemRole(role: unknown): SystemRole {
  if (
    role === "user" ||
    role === "staff" ||
    role === "service_admin" ||
    role === "admin" ||
    role === "super_admin" ||
    role === "owner"
  ) {
    return role;
  }
  throw new ApiError("VALIDATION_ERROR", "System role is invalid.", 400);
}

export function validatePermissionEffect(effect: unknown): PermissionEffect {
  if (effect === "allow" || effect === "deny") return effect;
  throw new ApiError("VALIDATION_ERROR", "Permission effect must be allow or deny.", 400);
}

export function validateAccessStatus(status: unknown): AccessStatus {
  if (status === "active" || status === "disabled" || status === "suspended") return status;
  throw new ApiError("VALIDATION_ERROR", "Access status must be active, disabled, or suspended.", 400);
}

export function validateMailRole(role: unknown): MailRole {
  if (role === "mailbox_user" || role === "mailbox_admin" || role === "mailbox_super") return role;
  throw new ApiError("VALIDATION_ERROR", "Mail role is invalid.", 400);
}

export function validateMailStatus(status: unknown): MailStatus {
  if (status === "active" || status === "disabled" || status === "suspended" || status === "deleted") return status;
  throw new ApiError("VALIDATION_ERROR", "Mail status is invalid.", 400);
}
