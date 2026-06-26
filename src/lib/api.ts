export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = body as ApiErrorPayload | null;
    throw new ApiClientError(
      errorBody?.error.code || "INTERNAL_ERROR",
      errorBody?.error.message || `Request failed with ${response.status}.`,
      response.status,
    );
  }

  return body as T;
}
