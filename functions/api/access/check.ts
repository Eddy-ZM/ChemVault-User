import { requireUser } from "../../_shared/auth";
import { evaluateAccessCheck, loadAccessSnapshot } from "../../_shared/permissions";
import { ApiError, handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const url = new URL(request.url);
    const permission = url.searchParams.get("permission");
    const service = url.searchParams.get("service");
    const page = url.searchParams.get("page");

    if (!permission && !service && !page) {
      throw new ApiError("VALIDATION_ERROR", "Provide permission, service, or page.", 400);
    }

    const snapshot = await loadAccessSnapshot(env.DB, user);
    const decision = evaluateAccessCheck(user, snapshot, { permission, service, page });

    return jsonResponse(request, {
      allowed: decision.allowed,
      reason: decision.reason,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        systemRole: user.system_role,
      },
    });
  });
