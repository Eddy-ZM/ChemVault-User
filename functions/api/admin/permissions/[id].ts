import { isMailRoleManagedPermissionKey, requireAdmin, writeAuditLog } from "../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../../_shared/responses";
import type { Env, PermissionDefinition } from "../../../_shared/types";

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

export const onRequestPatch: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const { user: actor } = await requireAdmin(env, request);
    const id = String(params.id || "");
    const payload = (await readJson(request)) as { name?: unknown; description?: unknown; category?: unknown };
    const current = await env.DB.prepare(`SELECT * FROM permissions WHERE id = ? LIMIT 1`).bind(id).first<PermissionDefinition>();
    if (!current) throw new ApiError("VALIDATION_ERROR", "Permission not found.", 404);
    if (isMailRoleManagedPermissionKey(current.key)) {
      throw new ApiError("VALIDATION_ERROR", "Mail runtime permissions follow Mail role assignment and cannot be managed in User Center.", 400);
    }

    const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim().slice(0, 180) : current.name;
    const description =
      typeof payload.description === "string" ? payload.description.trim().slice(0, 500) || null : current.description;
    const category =
      typeof payload.category === "string" && payload.category.trim() ? payload.category.trim().slice(0, 80) : current.category;

    await env.DB.prepare(`UPDATE permissions SET name = ?, description = ?, category = ? WHERE id = ?`)
      .bind(name, description, category, id)
      .run();

    await writeAuditLog({
      env,
      request,
      actorUserId: actor.id,
      action: "permission.update",
      resourceType: "permission",
      resourceId: id,
      details: { key: current.key, name, description, category },
    });

    const row = await env.DB.prepare(`SELECT * FROM permissions WHERE id = ?`).bind(id).first<PermissionDefinition>();
    return jsonResponse(request, { permission: row ? toPublicPermission(row) : null });
  });
