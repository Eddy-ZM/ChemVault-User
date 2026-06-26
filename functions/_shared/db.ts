import { randomId } from "./security";
import type { PublicUser, UserRow } from "./types";

export const publicUserColumns = `
  id,
  email,
  name,
  avatar_url,
  institution,
  field_of_interest,
  bio,
  website,
  role,
  COALESCE(system_role, 'user') AS system_role,
  COALESCE(source, 'local') AS source,
  COALESCE(global_status, status, 'active') AS global_status,
  status,
  created_at,
  updated_at,
  last_login_at
`;

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    institution: user.institution,
    fieldOfInterest: user.field_of_interest,
    bio: user.bio,
    website: user.website,
    role: user.role,
    systemRole: user.system_role || "user",
    source: user.source || "local",
    globalStatus: user.global_status || user.status || "active",
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return await db.prepare(`SELECT ${publicUserColumns}, password_hash FROM users WHERE email = ? LIMIT 1`).bind(email).first<UserRow>();
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return await db.prepare(`SELECT ${publicUserColumns}, password_hash FROM users WHERE id = ? LIMIT 1`).bind(id).first<UserRow>();
}

export async function insertDefaultServices(db: D1Database, userId: string, now: string): Promise<void> {
  const services = [
    { service: "search", status: "active" },
    { service: "extract", status: "active" },
    { service: "files", status: "active" },
    { service: "molecule", status: "coming_soon" },
    { service: "notif", status: "not_connected" },
  ];

  await db.batch(
    services.map((entry) =>
      db
        .prepare(
          `INSERT INTO connected_services (id, user_id, service, status, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(randomId("svc"), userId, entry.service, entry.status, now),
    ),
  );
}
