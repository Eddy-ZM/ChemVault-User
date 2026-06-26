import { requireUser } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

interface ExternalIdentityPublicRow {
  provider: string;
  provider_email: string;
  created_at: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const result = await env.DB.prepare(
      `SELECT provider, provider_email, created_at, updated_at
       FROM external_identities
       WHERE user_id = ?
       ORDER BY provider ASC`,
    )
      .bind(user.id)
      .all<ExternalIdentityPublicRow>();

    return jsonResponse(request, {
      identities: (result.results || []).map((identity) => ({
        provider: identity.provider,
        email: identity.provider_email,
        createdAt: identity.created_at,
        updatedAt: identity.updated_at,
      })),
    });
  });

