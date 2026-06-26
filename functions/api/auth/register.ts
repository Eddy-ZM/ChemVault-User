import { createSession, sessionCookie } from "../../_shared/auth";
import { getUserByEmail, insertDefaultServices, toPublicUser } from "../../_shared/db";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import { hashPassword, randomId } from "../../_shared/security";
import type { Env, UserRow } from "../../_shared/types";
import { requireValidRegisterPayload } from "../../_shared/validators";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const payload = requireValidRegisterPayload(await readJson(request));
    const existing = await getUserByEmail(env.DB, payload.email);
    if (existing) {
      throw new ApiError("EMAIL_ALREADY_EXISTS", "An account with this email already exists.", 409);
    }

    const now = new Date().toISOString();
    const user: UserRow = {
      id: randomId("user"),
      email: payload.email,
      password_hash: await hashPassword(payload.password),
      name: payload.name,
      avatar_url: null,
      institution: payload.institution || null,
      field_of_interest: payload.fieldOfInterest || null,
      bio: null,
      website: null,
      role: "free",
      system_role: "user",
      source: "local",
      global_status: "active",
      status: "active",
      created_at: now,
      updated_at: now,
      last_login_at: now,
    };

    await env.DB.prepare(
      `INSERT INTO users (
        id, email, password_hash, name, avatar_url, institution, field_of_interest,
        bio, website, role, system_role, source, global_status, status, created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        user.id,
        user.email,
        user.password_hash,
        user.name,
        user.avatar_url,
        user.institution,
        user.field_of_interest,
        user.bio,
        user.website,
        user.role,
        user.system_role,
        user.source,
        user.global_status,
        user.status,
        user.created_at,
        user.updated_at,
        user.last_login_at,
      )
      .run();

    await insertDefaultServices(env.DB, user.id, now);

    const session = await createSession({ env, request, userId: user.id });
    return jsonResponse(
      request,
      { user: toPublicUser(user) },
      { status: 201, headers: { "Set-Cookie": sessionCookie(env, request, session.token, session.expiresAt) } },
    );
  });
