# ChemVault Main Account System

`user.chemvault.science` is the ChemVault identity, permission, mail-account, and admin console. It is the main account system for ChemVault services such as `app.chemvault.science`, `file.chemvault.science`, `docs.chemvault.science`, `model.chemvault.science`, `extract.chemvault.science`, `molecule.chemvault.science`, and `notif.chemvault.science`.

The app includes account registration/login, httpOnly JWT cookie sessions, D1-backed users/sessions/usage/services, profile settings, security settings, plan placeholders, admin user management, fine-grained permissions, service/page access controls, ChemVault mail account assignment, mail admin sync, and audit logs.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- API: Cloudflare Pages Functions under `functions/`
- Database: Cloudflare D1 binding `DB`
- Avatar storage: Cloudflare R2 binding `AVATARS`, reserved for a future upload route
- Auth: signed JWT in an httpOnly cookie; D1 stores only the session token hash
- Password hashing: Workers-compatible Web Crypto PBKDF2-SHA256

## Local Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run typecheck
npx tsc -p tsconfig.functions.json --noEmit
npm run build
```

For local Pages Functions and D1 testing:

```bash
npm run build
npm run db:schema:local
npx wrangler d1 execute chemvault_user --local --file db/migrations/002_permissions_mail_system.sql
npm run pages:dev
```

Create a local `.dev.vars` file for `wrangler pages dev`:

```bash
JWT_SECRET="local-development-secret"
COOKIE_NAME="chemvault_session"
NODE_ENV="development"
MAIL_SYSTEM_SYNC_SECRET="local-mail-sync-secret"
```

Do not commit `.dev.vars`, real secrets, passwords, API keys, generated cookies, or generated admin SQL.

## Cloudflare Resources

Production resources:

- Pages project: `chemvault-user`
- D1 database: `chemvault_user`
- R2 bucket: `chemvault-user-avatars`
- Custom domain: `user.chemvault.science`

`wrangler.toml` contains the non-secret bindings and variables:

```toml
[[d1_databases]]
binding = "DB"
database_name = "chemvault_user"

[[r2_buckets]]
binding = "AVATARS"
bucket_name = "chemvault-user-avatars"

[vars]
COOKIE_NAME = "chemvault_session"
NODE_ENV = "production"
```

Set secrets outside source code:

```bash
openssl rand -base64 48 | npx wrangler pages secret put JWT_SECRET --project-name chemvault-user
npx wrangler pages secret put MAIL_SYSTEM_SYNC_SECRET --project-name chemvault-user
```

## Database Setup And Migration

Apply the base schema to a new database:

```bash
npm run db:schema:remote
```

Apply the main-system migration:

```bash
npx wrangler d1 execute chemvault_user --remote --file db/migrations/002_permissions_mail_system.sql
```

`db/migrations/002_permissions_mail_system.sql`:

- Adds `system_role`, `source`, and `global_status` to `users`
- Creates `permissions`, `user_permissions`, `role_permissions`
- Creates `service_access`, `page_access`, `mail_accounts`
- Creates `mail_admin_sync`, `admin_sync_logs`, and `audit_logs`
- Inserts default permission definitions and role permissions
- Promotes existing `role='admin'` users to `system_role='admin'`

The `CREATE TABLE` and `INSERT OR IGNORE` statements are safe to re-run. The `ALTER TABLE users ADD COLUMN ...` statements should be applied once per D1 database.

## Create Admin User

Generate admin SQL without npm banner output:

```bash
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="replace-with-a-strong-password" \
ADMIN_NAME="Edward" \
npm run --silent create-admin > db/admin.sql
```

Apply to production D1:

```bash
npx wrangler d1 execute chemvault_user --remote --file db/admin.sql
rm -f db/admin.sql
```

The generated admin has `role='admin'`, `system_role='admin'`, `source='local'`, and `global_status='active'`.

## Permission Model

Simple account tier remains in `users.role`:

- `free`
- `pro`
- `admin`

System authority is now controlled by `users.system_role`:

- `user`
- `staff`
- `service_admin`
- `admin`
- `super_admin`
- `owner`

Fine-grained permissions live in:

- `permissions`: global permission definitions such as `page:file:view`
- `role_permissions`: defaults for each `system_role`
- `user_permissions`: per-user allow/deny overrides
- `service_access`: per-user service access state
- `page_access`: per-user page access state

Decision rules:

- `owner` and `super_admin` have all permissions
- `disabled` or `deleted` users have no permissions
- Explicit `deny` beats `allow`
- User direct grants override role defaults
- Disabled/suspended service or page access blocks access
- Ordinary admins cannot downgrade or delete `owner`/`super_admin`
- Mail-system super users map to `super_admin` and cannot be downgraded by ordinary admins

## Mail System Integration

Main accounts can have zero or one active ChemVault mail account in `mail_accounts`.

Admins can assign and manage:

- `mail_address`
- `mail_display_name`
- `mail_role`: `mailbox_user`, `mailbox_admin`, `mailbox_super`
- `mail_status`: `active`, `disabled`, `suspended`, `deleted`
- `can_send`, `can_receive`, `can_login_mail`
- `mailbox_quota_mb`
- `aliases`

Use the UI at `/admin/mail`, or call:

```text
GET    /api/admin/mail/accounts
POST   /api/admin/mail/accounts
GET    /api/admin/mail/accounts/:id
PATCH  /api/admin/mail/accounts/:id
DELETE /api/admin/mail/accounts/:id
```

`DELETE` is a soft delete.

## Mail Admin Sync

Manual sync is available at `/admin/mail-sync` and:

```text
POST /api/admin/mail-sync/manual
```

Payload:

```json
{
  "superUsers": [{ "email": "owner@chemvault.science", "name": "Owner" }],
  "adminUsers": [{ "email": "admin@chemvault.science", "name": "Admin" }]
}
```

Rules:

- `superUsers` become `system_role='super_admin'`
- `adminUsers` become `system_role='admin'`
- Missing users are created as active main accounts with `source='mail_system'`
- No plaintext password is created for synced users
- Mail super users override ordinary local role edits
- Sync actions are written to `admin_sync_logs` and `audit_logs`

Automatic sync is reserved at:

```text
POST /api/admin/mail-sync/run
```

It currently returns a clear TODO response until the real `mail.chemvault.science` admin API is available. Protect the future integration with `MAIL_SYSTEM_SYNC_SECRET`.

## Admin Console Pages

- `/admin`: control-plane dashboard, stats, recent audit logs
- `/admin/users`: user list, search, filters, role/status edits
- `/admin/users/:id`: user detail, mail account, usage, grants, audit log
- `/admin/users/:id/permissions`: three-state permission editor
- `/admin/users/:id/services`: service access editor
- `/admin/users/:id/pages`: page access editor
- `/admin/permissions`: permission definition center
- `/admin/mail`: mail account manager
- `/admin/mail-sync`: mail admin sync

## API Overview

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

User:

- `PATCH /api/user/profile`
- `PATCH /api/user/password`
- `DELETE /api/user/account`
- `GET /api/user/usage`
- `GET /api/user/services`

Access check for other ChemVault services:

- `GET /api/access/check?permission=page:file:view`
- `GET /api/access/check?service=chemvault_file&page=file`

Admin:

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id`
- `PATCH /api/admin/users/:id/role`
- `PATCH /api/admin/users/:id/status`
- `GET /api/admin/permissions`
- `POST /api/admin/permissions`
- `PATCH /api/admin/permissions/:id`
- `GET /api/admin/users/:id/permissions`
- `PATCH /api/admin/users/:id/permissions`
- `GET /api/admin/users/:id/services`
- `PATCH /api/admin/users/:id/services`
- `GET /api/admin/users/:id/pages`
- `PATCH /api/admin/users/:id/pages`
- `GET /api/admin/mail/accounts`
- `POST /api/admin/mail/accounts`
- `GET /api/admin/mail/accounts/:id`
- `PATCH /api/admin/mail/accounts/:id`
- `DELETE /api/admin/mail/accounts/:id`
- `POST /api/admin/mail-sync/manual`
- `POST /api/admin/mail-sync/run`

Errors use:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password."
  }
}
```

## Other ChemVault Services

Update `src/lib/chemvaultAuthClient.ts` contains:

- `getCurrentUser()`
- `getUserPermissions()`
- `checkPermission(permissionKey)`
- `checkServiceAccess(serviceKey)`
- `checkPageAccess(pageKey)`
- `requirePermission(permissionKey)`
- `requireServiceAccess(serviceKey)`
- `requirePageAccess(pageKey)`
- `logout()`
- `getAuthHeaders()`

Example for `file.chemvault.science`:

```ts
await checkServiceAccess("chemvault_file");
await checkPermission("file:read");
await checkPageAccess("file");
```

Example for `docs.chemvault.science`:

```ts
await checkServiceAccess("chemvault_docs");
await checkPermission("docs:read");
await checkPageAccess("docs");
```

Example for `model.chemvault.science`:

```ts
await checkServiceAccess("chemvault_model");
await checkPermission("model:view");
await checkPageAccess("model");
```

Browser clients must call `https://user.chemvault.science/api/auth/me` or `/api/access/check` with `credentials: "include"` so the httpOnly cookie is sent. The API returns only minimal user identity for access checks.

## Deploy To Cloudflare Pages

Build command:

```bash
npm run build
```

Build output directory:

```text
dist
```

CLI deployment:

```bash
npm run deploy:pages
```

The Vite `public/_redirects` file is copied to `dist/_redirects` and provides SPA fallback for `/dashboard`, `/settings/profile`, `/admin/users/:id`, and other client routes. Pages Functions under `/api/*` are handled from `functions/`.

## Bind `user.chemvault.science`

In Cloudflare:

1. Open Workers & Pages.
2. Select `chemvault-user`.
3. Go to Custom domains.
4. Add `user.chemvault.science`.
5. Confirm DNS:

```text
Type: CNAME
Name: user
Target: chemvault-user.pages.dev
Proxy status: Proxied
```

6. Confirm SSL/TLS mode is Full or Full strict.
7. Wait for certificate issuance.
8. Open `https://user.chemvault.science`.

## Smoke Test

- Register and login a normal user.
- Confirm `/dashboard` works.
- Confirm logged-out `/dashboard` redirects to `/login`.
- Confirm normal user sees 403 on `/admin`.
- Login as admin and open `/admin`.
- Open `/admin/users`, `/admin/permissions`, `/admin/mail`, `/admin/mail-sync`.
- Give a user `page:file:view`, `service:chemvault_file`, and `file:read`.
- Confirm `/api/access/check?service=chemvault_file&page=file` returns `allowed: true`.
- Remove or deny `page:file:view` and confirm access returns false.
- Assign a mail account and confirm it appears on the user detail page.
- Run manual mail admin sync and confirm synced super users become `super_admin`.

## Future Stripe Integration

`/settings/plan` remains UI-only today. Add later:

- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/billing/webhook`
- D1 tables for subscriptions, invoices, Stripe customer ids, and entitlement changes

Entitlement changes should mirror into `users.role`, `role_permissions`, or dedicated subscription entitlement tables.

## Security Notes

- Do not store plaintext passwords.
- Do not store raw session tokens in D1.
- Do not commit `JWT_SECRET`, `MAIL_SYSTEM_SYNC_SECRET`, mail API keys, or generated admin SQL.
- `owner` cannot be downgraded or deleted through admin APIs.
- Ordinary admins cannot modify protected `super_admin`/`owner` accounts.
- All admin permission, mail, role, and status operations write audit logs.
- R2 avatar upload is still a TODO; profile currently stores `avatarUrl`.
