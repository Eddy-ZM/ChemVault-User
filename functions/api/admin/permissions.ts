import { isMailRoleManagedPermissionKey, requireAdmin } from "../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import { randomId } from "../../_shared/security";
import type { Env, PermissionDefinition } from "../../_shared/types";
import { writeAuditLog } from "../../_shared/permissions";

function toPublicPermission(row: PermissionDefinition) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    category: row.category,
    createdAt: row.created_at,
  };
}

function validatePermissionPayload(input: unknown): Omit<PermissionDefinition, "id" | "created_at"> {
  const payload = input as Partial<Record<"key" | "name" | "description" | "category", unknown>>;
  const key = typeof payload.key === "string" ? payload.key.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const category = typeof payload.category === "string" ? payload.category.trim() : "";

  if (!/^[a-z][a-z0-9_:-]{2,160}$/.test(key)) {
    throw new ApiError("VALIDATION_ERROR", "Permission key format is invalid.", 400);
  }
  if (!name) throw new ApiError("VALIDATION_ERROR", "Permission name is required.", 400);
  if (!category) throw new ApiError("VALIDATION_ERROR", "Permission category is required.", 400);
  if (isMailRoleManagedPermissionKey(key)) {
    throw new ApiError("VALIDATION_ERROR", "Mail runtime permissions follow Mail role assignment and cannot be created in User Center.", 400);
  }

  return {
    key,
    name: name.slice(0, 180),
    description: description ? description.slice(0, 500) : null,
    category: category.slice(0, 80),
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    await requireAdmin(env, request);
    const rows = await env.DB.prepare(`SELECT * FROM permissions ORDER BY category, key`).all<PermissionDefinition>();
    return jsonResponse(request, { permissions: (rows.results || []).filter((row) => !isMailRoleManagedPermissionKey(row.key)).map(toPublicPermission) });
  });

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const payload = validatePermissionPayload(await readJson(request));
    const id = randomId("perm");
    const now = new Date().toISOString();

    try {
      await env.DB.prepare(
        `INSERT INTO permissions (id, key, name, description, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, payload.key, payload.name, payload.description, payload.category, now)
        .run();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Permission key already exists.", 409);
    }

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      action: "permission.create",
      resourceType: "permission",
      resourceId: id,
      details: payload,
    });

    const row = await env.DB.prepare(`SELECT * FROM permissions WHERE id = ?`).bind(id).first<PermissionDefinition>();
    return jsonResponse(request, { permission: row ? toPublicPermission(row) : null }, { status: 201 });
  });
