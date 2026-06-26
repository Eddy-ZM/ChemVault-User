import { requireUser } from "../../_shared/auth";
import { getUserById, toPublicUser } from "../../_shared/db";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import type { Env } from "../../_shared/types";
import { validateProfilePayload } from "../../_shared/validators";

const columnMap = {
  name: "name",
  institution: "institution",
  fieldOfInterest: "field_of_interest",
  bio: "bio",
  website: "website",
  avatarUrl: "avatar_url",
} as const;

export const onRequestPatch: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const updates = validateProfilePayload(await readJson(request));
    const now = new Date().toISOString();
    const entries = Object.entries(updates) as Array<[keyof typeof columnMap, string | null]>;

    const assignments = entries.map(([key]) => `${columnMap[key]} = ?`).join(", ");
    await env.DB.prepare(`UPDATE users SET ${assignments}, updated_at = ? WHERE id = ?`)
      .bind(...entries.map(([, value]) => value), now, user.id)
      .run();

    const updated = await getUserById(env.DB, user.id);
    if (!updated) throw new ApiError("UNAUTHORIZED", "Authentication is required.", 401);

    return jsonResponse(request, { user: toPublicUser(updated) });
  });
