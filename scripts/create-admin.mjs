import { webcrypto } from "node:crypto";

const cryptoApi = globalThis.crypto || webcrypto;
const encoder = new TextEncoder();
const iterations = 100_000;

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
const name = process.env.ADMIN_NAME?.trim() || "ChemVault Admin";

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const now = new Date().toISOString();
const userId = randomId("user");
const passwordHash = await hashPassword(password);
const services = [
  ["search", "active"],
  ["extract", "active"],
  ["files", "active"],
  ["molecule", "coming_soon"],
  ["notif", "not_connected"],
];

console.log("-- Generated ChemVault admin seed SQL. Review before applying.");
console.log(
  `INSERT INTO users (id, email, password_hash, name, avatar_url, institution, field_of_interest, bio, website, role, system_role, source, global_status, status, created_at, updated_at, last_login_at)
VALUES ('${sql(userId)}', '${sql(email)}', '${sql(passwordHash)}', '${sql(name)}', NULL, NULL, NULL, NULL, NULL, 'admin', 'admin', 'local', 'active', 'active', '${sql(now)}', '${sql(now)}', NULL);`,
);

for (const [service, status] of services) {
  console.log(
    `INSERT INTO connected_services (id, user_id, service, status, created_at)
VALUES ('${sql(randomId("svc"))}', '${sql(userId)}', '${sql(service)}', '${sql(status)}', '${sql(now)}');`,
  );
}

async function hashPassword(value) {
  const salt = new Uint8Array(16);
  cryptoApi.getRandomValues(salt);
  const key = await cryptoApi.subtle.importKey("raw", encoder.encode(value), "PBKDF2", false, ["deriveBits"]);
  const derived = await cryptoApi.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return `pbkdf2$sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(derived))}`;
}

function randomId(prefix) {
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return `${prefix}_${toBase64Url(bytes)}`;
}

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function sql(value) {
  return String(value).replace(/'/g, "''");
}
