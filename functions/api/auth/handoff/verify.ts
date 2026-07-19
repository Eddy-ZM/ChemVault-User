import { getUserById, toPublicUser } from "../../../_shared/db";
import {
  parseUserSystemHandoffAudience,
  uomMailSystemAudience,
  uomMailSystemFullAccessPermission,
  uomMailSystemPermission,
  verifyUserSystemHandoffToken,
} from "../../../_shared/handoff";
import { enrichPublicUser, evaluateAccessCheck, loadAccessSnapshot } from "../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse } from "../../../_shared/responses";
import type { Env } from "../../../_shared/types";
import { isUserActive } from "../../../_shared/userStatus";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const token = getBearerToken(request);
    if (!token) {
      throw new ApiError("UNAUTHORIZED", "User System handoff token is required.", 401);
    }

    const url = new URL(request.url);
    const audienceValues = url.searchParams.getAll("audience");
    const permissionValues = url.searchParams.getAll("permission");
    if (audienceValues.length > 1 || permissionValues.length > 1) {
      throw new ApiError("VALIDATION_ERROR", "Duplicate handoff verification parameters are not allowed.", 400);
    }

    const audience = parseUserSystemHandoffAudience(audienceValues[0] || null);
    const permission = permissionValues[0] || null;
    const isUomMailSystemPermission =
      permission === uomMailSystemPermission || permission === uomMailSystemFullAccessPermission;
    if (audience === uomMailSystemAudience && !isUomMailSystemPermission) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `permission must be ${uomMailSystemPermission} or ${uomMailSystemFullAccessPermission}.`,
        400,
      );
    }
    if (audience === "chemvault-lab" && permission) {
      throw new ApiError("VALIDATION_ERROR", "Lab handoff verification does not accept a permission parameter.", 400);
    }

    const payload = await verifyUserSystemHandoffToken(env, token, audience);
    const user = await getUserById(env.DB, payload.sub);
    if (!user || !isUserActive(user)) {
      throw new ApiError("UNAUTHORIZED", "User System user is not active.", 401);
    }

    const access = permission
      ? evaluateAccessCheck(user, await loadAccessSnapshot(env.DB, user), { permission })
      : null;

    return jsonResponse(request, {
      user: { ...toPublicUser(user), ...(await enrichPublicUser(env.DB, user)) },
      handoff: {
        audience: payload.aud,
        expiresAt: payload.exp,
      },
      ...(access ? { access } : {}),
    });
  });

function getBearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
