import { requireUser } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

interface ExternalIdentityPublicRow {
  provider: string;
  provider_email: string;
  created_at: string;
  updated_at: string;
}

const loginProviders = ["apple", "google", "microsoft", "github", "chemvault_mail"];

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
    const identities = result.results || [];
    const hasPasswordLogin = user.password_hash.startsWith("pbkdf2$");
    const loginIdentityCount = identities.filter((identity) => loginProviders.includes(identity.provider)).length;

    return jsonResponse(request, {
      hasPasswordLogin,
      loginIdentityCount,
      identities: identities.map((identity) => ({
        provider: identity.provider,
        email: identity.provider_email,
        createdAt: identity.created_at,
        updatedAt: identity.updated_at,
        canUnlink: hasPasswordLogin || loginIdentityCount > 1,
      })),
    });
  });
