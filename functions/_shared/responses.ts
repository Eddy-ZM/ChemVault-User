import { corsHeaders } from "./cors";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "USER_DISABLED"
  | "USER_DELETION_PENDING"
  | "USER_DELETED"
  | "SSO_NOT_CONFIGURED"
  | "INVALID_SSO_ASSERTION"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function jsonResponse(request: Request, body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  corsHeaders(request).forEach((value, key) => headers.set(key, value));

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function errorResponse(request: Request, error: unknown): Response {
  if (!(error instanceof ApiError)) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("Unhandled API error", message);
  }

  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);

  return jsonResponse(
    request,
    {
      error: {
        code: apiError.code,
        message: apiError.message,
      },
    },
    { status: apiError.status },
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }
}

export async function handleApi(request: Request, action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    return errorResponse(request, error);
  }
}
