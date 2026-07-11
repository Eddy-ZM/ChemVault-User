import { getUserById, toPublicUser } from "../../../_shared/db";
import { verifyUserSystemHandoffToken } from "../../../_shared/handoff";
import { enrichPublicUser } from "../../../_shared/permissions";
import { ApiError, handleApi, jsonResponse } from "../../../_shared/responses";
import type { Env } from "../../../_shared/types";
import { isUserActive } from "../../../_shared/userStatus";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const token = getBearerToken(request);
    if (!token) {
      throw new ApiError("UNAUTHORIZED", "User System handoff token is required.", 401);
    }

    const payload = await verifyUserSystemHandoffToken(env, token, "chemvault-lab");
    const user = await getUserById(env.DB, payload.sub);
    if (!user || !isUserActive(user)) {
      throw new ApiError("UNAUTHORIZED", "User System user is not active.", 401);
    }

    return jsonResponse(request, {
      user: { ...toPublicUser(user), ...(await enrichPublicUser(env.DB, user)) },
      handoff: {
        audience: payload.aud,
        expiresAt: payload.exp,
      },
    });
  });

function getBearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
