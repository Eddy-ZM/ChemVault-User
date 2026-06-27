import { requireUser } from "../../../_shared/auth";
import { ApiError, handleApi, jsonResponse } from "../../../_shared/responses";
import type { Env } from "../../../_shared/types";

const unlinkableProviders = ["apple", "google", "microsoft", "github"];
const loginProviders = ["apple", "google", "microsoft", "github", "chemvault_mail"];

export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) =>
  handleApi(request, async () => {
    const provider = String(params.provider || "");
    if (!unlinkableProviders.includes(provider)) {
      throw new ApiError("VALIDATION_ERROR", "This sign-in provider cannot be unlinked here.", 400);
    }

    const { user } = await requireUser(env, request);
    const identity = await env.DB.prepare(
      `SELECT id FROM external_identities
       WHERE user_id = ? AND provider = ?
       LIMIT 1`,
    )
      .bind(user.id, provider)
      .first<{ id: string }>();
    if (!identity) throw new ApiError("VALIDATION_ERROR", "This sign-in provider is not linked.", 404);

    const placeholders = loginProviders.map(() => "?").join(", ");
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM external_identities
       WHERE user_id = ? AND provider IN (${placeholders})`,
    )
      .bind(user.id, ...loginProviders)
      .first<{ count: number }>();

    const hasPasswordLogin = user.password_hash.startsWith("pbkdf2$");
    if (!hasPasswordLogin && Number(countRow?.count || 0) <= 1) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Add a password or another sign-in method before unlinking your last connected account.",
        400,
      );
    }

    await env.DB.prepare(`DELETE FROM external_identities WHERE id = ? AND user_id = ?`).bind(identity.id, user.id).run();
    return jsonResponse(request, { ok: true });
  });
