import { parseMailUserSyncPayload, requireMailSyncSecret, syncMailUser } from "../../../../_shared/mailUserSync";
import { handleApi, jsonResponse, readJson } from "../../../../_shared/responses";
import type { Env } from "../../../../_shared/types";

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    await requireMailSyncSecret(env, request);
    const payload = parseMailUserSyncPayload(await readJson(request));
    const result = await syncMailUser(env, request, payload);
    return jsonResponse(request, result, { status: result.action === "created" ? 201 : 200 });
  });
