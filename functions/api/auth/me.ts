import { requireUser } from "../../_shared/auth";
import { toPublicUser } from "../../_shared/db";
import { enrichPublicUser } from "../../_shared/permissions";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    return jsonResponse(request, { user: { ...toPublicUser(user), ...(await enrichPublicUser(env.DB, user)) } });
  });
