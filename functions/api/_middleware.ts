import { corsHeaders } from "../_shared/cors";
import type { Env } from "../_shared/types";

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const response = await next();
  const headers = new Headers(response.headers);
  corsHeaders(request).forEach((value, key) => headers.set(key, value));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
