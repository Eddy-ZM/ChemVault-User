const allowedOrigins = new Set([
  "https://user.chemvault.science",
  "https://app.chemvault.science",
  "https://file.chemvault.science",
  "https://docs.chemvault.science",
  "https://model.chemvault.science",
  "https://molecule.chemvault.science",
  "https://notif.chemvault.science",
  "https://lab.chemvault.science",
  "https://chemvault.science",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8788",
  "http://127.0.0.1:8788",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");

  return headers;
}
