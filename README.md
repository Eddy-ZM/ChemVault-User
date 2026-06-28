# ChemVault Main Account System

`user.chemvault.science` is the ChemVault identity, permission, mail-account, and admin console. It is the main account system for ChemVault services such as `app.chemvault.science`, `file.chemvault.science`, `docs.chemvault.science`, `model.chemvault.science`, `extract.chemvault.science`, `molecule.chemvault.science`, and `notif.chemvault.science`.

The app includes account registration/login, httpOnly JWT cookie sessions, D1-backed users/sessions/usage/services, profile settings, security settings, plan placeholders, admin user management, fine-grained permissions, service/page access controls, ChemVault mail account assignment, mail admin sync, and audit logs.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- API: Cloudflare Pages Functions under `functions/`
- Database: Cloudflare D1 binding `DB`
- Avatar storage: Cloudflare R2 binding `AVATARS`, reserved for a future upload route
- Email sending: Cloudflare Email Sending REST API, used for mailbox application notifications from Pages Functions
- Auth: signed JWT in an httpOnly cookie; D1 stores only the session token hash
- Password hashing: Workers-compatible Web Crypto PBKDF2-SHA256
- External auth: ChemVault Mail password compatibility, signed Mail SSO assertions, and Apple Account SSO

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
# Leave unset for localhost. Production uses ".chemvault.science" so ChemVault
# subdomains such as notif.chemvault.science can read the shared session.
# COOKIE_DOMAIN=".chemvault.science"
NODE_ENV="development"
MAIL_SYSTEM_SYNC_SECRET="local-mail-sync-secret"
MAIL_SYSTEM_SSO_SECRET="local-mail-sso-secret"
# Optional, only after the mail system exposes an authorize endpoint:
# MAIL_SYSTEM_SSO_URL="https://mail.chemvault.science/api/sso/authorize"

# Optional, only after Apple Developer Sign in with Apple is configured:
# APPLE_CLIENT_ID="science.chemvault.user"
# APPLE_TEAM_ID="YOUR_APPLE_TEAM_ID"
# APPLE_KEY_ID="YOUR_APPLE_KEY_ID"
# APPLE_REDIRECT_URI="https://user.chemvault.science/api/auth/sso/apple/callback"
# APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Optional Google / Microsoft / GitHub OAuth.
# For local callback testing, set AUTH_URL="http://localhost:3000" and configure
# provider callback URLs as http://localhost:3000/api/auth/sso/{provider}/callback.
# AUTH_URL="https://user.chemvault.science"
# AUTH_SECRET="local-oauth-state-secret"
# GOOGLE_CLIENT_ID="..."
# GOOGLE_CLIENT_SECRET="..."
# MICROSOFT_CLIENT_ID="..."
# MICROSOFT_CLIENT_SECRET="..."
# MICROSOFT_TENANT_ID="common"
# GITHUB_CLIENT_ID="..."
# GITHUB_CLIENT_SECRET="..."

# Optional local Turnstile testing. Without this, local development skips human verification.
# TURNSTILE_SITE_KEY="1x00000000000000000000AA"
# TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
# TURNSTILE_EXPECTED_HOSTNAME="localhost"

# Optional mailbox application email routing. Production defaults are in wrangler.toml.
# MAIL_APPLICATION_TO="it.apply@chemvault.science"
# MAIL_APPLICATION_FROM="no-reply@chemvault.science"
# Required only when testing mailbox application email delivery locally:
# CLOUDFLARE_EMAIL_ACCOUNT_ID="your-cloudflare-account-id"
# CLOUDFLARE_EMAIL_API_TOKEN="email-sending-api-token"
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
COOKIE_DOMAIN = ".chemvault.science"
NODE_ENV = "production"
MAIL_APPLICATION_TO = "it.apply@chemvault.science"
MAIL_APPLICATION_FROM = "no-reply@chemvault.science"
```

Set secrets outside source code:

```bash
openssl rand -base64 48 | npx wrangler pages secret put JWT_SECRET --project-name chemvault-user
npx wrangler pages secret put MAIL_SYSTEM_SYNC_SECRET --project-name chemvault-user
npx wrangler pages secret put MAIL_SYSTEM_SSO_SECRET --project-name chemvault-user
npx wrangler pages secret put CLOUDFLARE_EMAIL_ACCOUNT_ID --project-name chemvault-user
npx wrangler pages secret put CLOUDFLARE_EMAIL_API_TOKEN --project-name chemvault-user
npx wrangler pages secret put APPLE_PRIVATE_KEY --project-name chemvault-user
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name chemvault-user
```

`MAIL_SYSTEM_SSO_SECRET` is optional when it intentionally shares the same value as `MAIL_SYSTEM_SYNC_SECRET`; the code falls back to the sync secret. Set `MAIL_SYSTEM_SSO_URL` as a non-secret Pages variable only after the mail system has a real SSO authorize endpoint.

Apple Account login also needs these values after Apple Developer setup. They may be set as Cloudflare Pages variables in the dashboard, committed as non-secret `[vars]` only if appropriate for the environment, or set via the Pages secret command:

```bash
npx wrangler pages secret put APPLE_CLIENT_ID --project-name chemvault-user
npx wrangler pages secret put APPLE_TEAM_ID --project-name chemvault-user
npx wrangler pages secret put APPLE_KEY_ID --project-name chemvault-user
npx wrangler pages secret put APPLE_REDIRECT_URI --project-name chemvault-user
```

`APPLE_PRIVATE_KEY` is a secret and must not be committed. If the private key is stored as one line, keep escaped `\n` line breaks; the Worker normalizes them at runtime.

## Email Registration Verification

Email self-registration is protected with Cloudflare Turnstile in production. The registration page calls:

```text
GET /api/auth/register-options
```

That endpoint returns the Turnstile site key and action for the current environment. `POST /api/auth/register` requires a valid `turnstileToken` when `NODE_ENV=production` or `TURNSTILE_SECRET_KEY` is configured. The server validates the token through Cloudflare `siteverify` before creating the account, so bypassing the browser does not bypass verification.

Required Cloudflare setup:

1. Create a Turnstile widget in Cloudflare for `user.chemvault.science`.
2. Configure the public site key as a Pages variable:

```bash
npx wrangler pages secret put TURNSTILE_SITE_KEY --project-name chemvault-user
```

3. Configure the secret key as a Pages secret:

```bash
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name chemvault-user
```

4. Set `TURNSTILE_EXPECTED_HOSTNAME=user.chemvault.science` as a Pages variable or secret if hostname enforcement should be strict.

Production fails closed: if `NODE_ENV=production` and `TURNSTILE_SECRET_KEY` is missing, email registration returns a clear verification configuration error instead of creating accounts without protection. Local development skips verification unless a Turnstile secret is configured.

Email-code verification is the alternate path if ChemVault later enables transactional email. That path should create short-lived, rate-limited verification codes, hash stored codes, enforce resend limits, and only create accounts after code confirmation.

`/login` and `/register` accept a `returnTo` query parameter for ChemVault services such as `https://app.chemvault.science/dashboard`. The frontend validates the target against ChemVault-owned domains and local development origins before redirecting after successful authentication.

## Database Setup And Migration

Apply the base schema to a new database:

```bash
npm run db:schema:remote
```

Apply the main-system migration:

```bash
npx wrangler d1 execute chemvault_user --remote --file db/migrations/002_permissions_mail_system.sql
npx wrangler d1 execute chemvault_user --remote --file db/migrations/003_external_identities_sso.sql
npx wrangler d1 execute chemvault_user --remote --file db/migrations/004_oauth_provider_accounts.sql
npx wrangler d1 execute chemvault_user --remote --file db/migrations/005_purge_soft_deleted_users.sql
```

`db/migrations/002_permissions_mail_system.sql`:

- Adds `system_role`, `source`, and `global_status` to `users`
- Creates `permissions`, `user_permissions`, `role_permissions`
- Creates `service_access`, `page_access`, `mail_accounts`
- Creates `mail_admin_sync`, `admin_sync_logs`, and `audit_logs`
- Inserts default permission definitions and role permissions
- Promotes existing `role='admin'` users to `system_role='admin'`

`db/migrations/003_external_identities_sso.sql` creates `external_identities`, which links a main account to ChemVault Mail identities and stores imported mail credential hashes for password compatibility. It stores external password hashes and salts only, never plaintext mail passwords.

`db/migrations/004_oauth_provider_accounts.sql` extends `external_identities` with OAuth-account fields for Google, Microsoft, and GitHub account metadata. Current runtime code does not persist third-party access tokens after login; ChemVault sessions remain independent httpOnly sessions.

`db/migrations/005_purge_soft_deleted_users.sql` converts legacy soft-deleted users into one deletion audit record per user, then removes user-scoped records and deletes the user row so the same email or OAuth identity can register again.

The `CREATE TABLE` and `INSERT OR IGNORE` statements are safe to re-run. The `ALTER TABLE ... ADD COLUMN` statements in migrations 002 and 004 should be applied once per D1 database.

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

## Admin User Deletion

Admins can delete users from `/admin/users` or `/admin/users/:id`. The UI calls:

```text
DELETE /api/admin/users/:id
```

Deletion keeps one audit entry for the deleted user, revokes active sessions, removes linked sign-in providers and user-scoped records, then physically removes the `users` row so the same email or OAuth identity can create a fresh account later. Owner accounts cannot be deleted, and ordinary admins cannot delete protected `super_admin` or `owner` users.

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

Users who signed in through Apple Account, Google, GitHub, email registration, or another non-mail identity can bind or request a ChemVault mailbox from `/onboarding/mail` or `/services`.

Existing ChemVault Mail users can bind their mailbox after Mail password verification:

```text
POST /api/user/mail-binding
```

`POST /api/user/mail-binding` accepts a `mailAddress` and Mail password, verifies them through the Mail Worker internal `/api/internal/user-center/password-login` endpoint, rejects mailboxes already bound to another main account, creates the `chemvault_mail` external identity, upserts the `mail_accounts` row, grants active mail access permissions, and writes `mail_account.bind` to `audit_logs`. The Mail password is never stored by User Center.

Users without a mailbox can request one:

```text
POST /api/user/mail-application
```

The request validates the desired `@chemvault.science` address, rejects accounts that already have a mailbox, sends a notification email to `MAIL_APPLICATION_TO` (default `it.apply@chemvault.science`), and writes `mail_application.request` to `audit_logs`.

Cloudflare Email Service must be enabled for the sending domain before this API can deliver notifications. Pages projects do not currently accept the Workers `send_email` binding in `wrangler.toml`, so this project sends through Cloudflare's Email Sending REST API.

```bash
npx wrangler email sending list
npx wrangler email sending enable chemvault.science
npx wrangler pages secret put CLOUDFLARE_EMAIL_ACCOUNT_ID --project-name chemvault-user
npx wrangler pages secret put CLOUDFLARE_EMAIL_API_TOKEN --project-name chemvault-user
```

The API token needs Cloudflare Email Sending permission for the account. The default sender is `no-reply@chemvault.science`. Change `MAIL_APPLICATION_FROM` only to an address on a domain onboarded to Cloudflare Email Sending.

## Mail Password Compatibility

ChemVault User Center can now accept an existing ChemVault Mail password for mail-system users. Login order is:

1. Verify the local User Center PBKDF2 password in `users.password_hash`.
2. If that fails, verify the linked ChemVault Mail credential from `external_identities`.

The mail credential format is the existing mail-system SHA-256 salt-prefix format:

```text
Base64(SHA-256(mail_salt + password))
```

Imported rows use:

- `provider='chemvault_mail'`
- `credential_algorithm='mail_sha256_salt_prefix_base64'`
- `credential_hash` and `credential_salt` copied from the mail system

Do not commit generated import SQL, password hashes, salts, or plaintext credentials. Use a one-off admin script or D1 import on a trusted machine, then delete the generated file.

## Mail SSO

The login page includes a "Continue with ChemVault Mail" entry. The button first runs Cloudflare Turnstile in background mode with action `mail_sso`, then posts the token to User Center:

```text
GET /api/auth/sso/mail/options
POST /api/auth/sso/mail/start
```

`POST /api/auth/sso/mail/start` accepts:

```json
{
  "returnTo": "/dashboard",
  "turnstileToken": "..."
}
```

If `MAIL_SYSTEM_SSO_URL` is configured and the Turnstile token passes Cloudflare `siteverify`, the API returns the mail-system redirect URL. The user is then redirected to the mail system with:

- `client_id=chemvault_user`
- `redirect_uri=https://user.chemvault.science/api/auth/sso/mail/callback`
- `return_to=/dashboard`

Direct `GET /api/auth/sso/mail/start` also requires a Turnstile token query parameter when verification is enabled, so opening the endpoint directly does not bypass human verification. Apple Account login intentionally does not use Turnstile.

The mail system should redirect back to the callback with a signed assertion:

```text
GET /api/auth/sso/mail/callback?email=...&name=...&mailUserId=...&iat=...&nonce=...&signature=...&returnTo=/dashboard
```

`POST /api/auth/sso/mail/callback` accepts the same fields as JSON.

The signature is base64url HMAC-SHA256 using `MAIL_SYSTEM_SSO_SECRET` over this canonical string:

```text
lowercase_email
mailUserId_or_empty
trimmed_name
iat_milliseconds
nonce
```

Assertions expire after five minutes. A valid SSO callback upserts the main account, links the external mail identity, creates a default mail account if needed, and sets the normal User Center httpOnly session cookie. Until the mail system exposes the authorize endpoint, `/api/auth/sso/mail/start` redirects back to `/login?sso=mail_not_configured`.

## Apple Account SSO

The login and registration screens include "Continue with Apple Account". It starts at:

```text
GET /api/auth/sso/apple/start?returnTo=/dashboard
```

The browser first attempts the Apple JavaScript popup flow:

```text
GET  /api/auth/sso/apple/options?returnTo=/dashboard
POST /api/auth/sso/apple/complete
```

`/api/auth/sso/apple/options` returns only client-safe values such as `clientId`, `redirectUri`, `state`, `nonce`, and `usePopup=true`. The Apple authorization code is still exchanged server-side by `/api/auth/sso/apple/complete`, which sets the same httpOnly session cookie as the redirect flow. If Apple JS is unavailable or popup initialization fails, the button falls back to the existing `/api/auth/sso/apple/start` redirect flow.

When Apple Developer configuration is present, User Center redirects to Apple's authorization endpoint with:

- `client_id=APPLE_CLIENT_ID`
- `redirect_uri=APPLE_REDIRECT_URI` or `https://user.chemvault.science/api/auth/sso/apple/callback`
- `response_type=code`
- `response_mode=form_post`
- `scope=name email`
- a signed state value using `JWT_SECRET`

The callback exchanges the authorization code at Apple's token endpoint, verifies Apple's `id_token` signature against Apple's JWKS, checks issuer/audience/expiry claims, then links or creates a ChemVault main account using `external_identities` with `provider='apple'`.

Existing ChemVault users can bind Apple Account from `/settings/security`. The binding flow uses:

```text
GET /api/auth/sso/apple/start?mode=link&returnTo=/settings/security?apple=linked
```

The link flow requires the current ChemVault session before redirecting to Apple. After Apple confirms ownership, the Apple subject is linked to the current main account instead of creating a second account.

New accounts created by Apple sign-in are redirected to `/onboarding/apple`, where the user completes display name, institution, field of interest, and optional bio before entering the dashboard.

Required Apple Developer setup:

1. Enable Sign in with Apple for the relevant Apple Developer account.
2. Create or use a Services ID for the web client, for example `science.chemvault.user`.
3. Add this Return URL exactly: `https://user.chemvault.science/api/auth/sso/apple/callback`.
4. Create a Sign in with Apple private key and record `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and the downloaded private key.
5. Configure Cloudflare Pages variables/secrets listed above, then redeploy.

Until those values are configured, `/api/auth/sso/apple/start` redirects back to `/login?sso=apple_not_configured` instead of failing.

## Third-party OAuth Login Setup

Google, Microsoft, and GitHub sign-in use the same `external_identities` binding model as Apple Account. The provider identity is only used to prove account ownership. ChemVault still creates its own httpOnly session cookie, and third-party access tokens are not used as ChemVault credentials. New third-party users are created as `role='free'` and `system_role='user'`; provider login never grants admin or super-admin status by itself.

Canonical production callback URLs:

```text
https://user.chemvault.science/api/auth/sso/google/callback
https://user.chemvault.science/api/auth/sso/microsoft/callback
https://user.chemvault.science/api/auth/sso/github/callback
```

Canonical local callback URLs:

```text
http://localhost:3000/api/auth/sso/google/callback
http://localhost:3000/api/auth/sso/microsoft/callback
http://localhost:3000/api/auth/sso/github/callback
```

Set `AUTH_URL` to the public origin that matches the provider callback being tested. Use `AUTH_URL=https://user.chemvault.science` in production. Use `AUTH_URL=http://localhost:3000` when testing with a local OAuth app configured for localhost.

After Apple Account, Google, or GitHub sign-in, User Center redirects users without an assigned mailbox to `/onboarding/mail`. The page asks whether they already have a `@chemvault.science` mailbox. Existing Mail users can bind it immediately with their Mail password; users without one can send a mailbox application email to `MAIL_APPLICATION_TO` (default `it.apply@chemvault.science`) or continue without a mailbox.

### Google Cloud Console

1. Open Google Cloud Console and create or select a project.
2. Configure the OAuth consent screen for the ChemVault User Center application.
3. Create an OAuth Client ID.
4. Set Application type to `Web application`.
5. Add Authorized JavaScript origins:
   - `https://user.chemvault.science`
   - `http://localhost:3000` for local testing, if needed
6. Add Authorized redirect URIs:
   - `https://user.chemvault.science/api/auth/sso/google/callback`
   - `http://localhost:3000/api/auth/sso/google/callback` for local testing, if needed
7. Configure Cloudflare Pages:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

Requested Google scopes are limited to `openid email profile`. Do not add Gmail, Drive, Calendar, or other Google API scopes.

### Microsoft Entra

Microsoft sign-in is currently shown as disabled in the product with this user-facing message: `Temporarily unavailable due to Microsoft-side limitations.` Keep the setup notes below for future activation.

1. Open Microsoft Entra admin center and create an App Registration.
2. Set Supported account types to personal Microsoft accounts and work/school accounts if ChemVault should accept both.
3. Add Web redirect URIs:
   - `https://user.chemvault.science/api/auth/sso/microsoft/callback`
   - `http://localhost:3000/api/auth/sso/microsoft/callback` for local testing, if needed
4. Create a client secret.
5. Add API permissions:
   - `openid`
   - `email`
   - `profile`
   - `User.Read`
6. Configure Cloudflare Pages:
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
   - `MICROSOFT_TENANT_ID=common`

Requested Microsoft scopes are limited to identity profile and `User.Read`. Do not add Outlook, OneDrive, Teams, Mail, Files, or Graph write permissions.

### GitHub Developer Settings

GitHub OAuth Apps usually support one Authorization callback URL. For production plus local testing, create two OAuth Apps.

Production OAuth App:

1. Homepage URL: `https://user.chemvault.science`
2. Authorization callback URL: `https://user.chemvault.science/api/auth/sso/github/callback`
3. Configure Cloudflare Pages production:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

Local development OAuth App:

1. Homepage URL: `http://localhost:3000`
2. Authorization callback URL: `http://localhost:3000/api/auth/sso/github/callback`
3. Put the local app credentials in `.dev.vars`.

Requested GitHub scopes are limited to `read:user user:email`. Do not add `repo`, `workflow`, `admin`, package, organization write, or other private-data scopes.

Existing users can connect or disconnect Apple Account, Google, Microsoft, and GitHub from `/settings/security`. If a user has no password login and only one connected sign-in provider, User Center blocks unlinking that final provider to prevent lockout.

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

## Direct Mail User Sync

Mail Worker can now push newly created Mail users and Mail accounts into User Center immediately:

```text
POST /api/integrations/mail/users/sync
```

The request must include either `x-chemvault-sync-secret: <secret>` or `Authorization: Bearer <secret>`. The secret should match the User Center `MAIL_SYSTEM_SYNC_SECRET` Cloudflare Pages secret. During migration, the endpoint also accepts `MAIL_SYSTEM_SSO_SECRET` so the existing Mail Worker SSO secret can be reused until a dedicated sync secret is configured.

Payload accepted from Mail Worker:

```json
{
  "primaryEmail": "user@chemvault.science",
  "name": "User",
  "mailAddress": "user@chemvault.science",
  "displayName": "User",
  "mailRole": "mailbox_user",
  "mailStatus": "active",
  "canSend": true,
  "canReceive": true,
  "canLoginMail": true,
  "mailboxQuotaMb": 1024,
  "aliases": [],
  "sourceUserId": "123"
}
```

Rules:

- Missing primary users are created as `source='mail_system'`, `role='free'`, `system_role='user'`.
- `mailbox_admin` promotes the main account to `system_role='admin'`.
- `mailbox_super` promotes the main account to `system_role='super_admin'`.
- Ordinary Mail users never become admin or super admin.
- Existing owner accounts are never downgraded.
- Existing admin/super admin accounts are not downgraded by an ordinary mailbox sync.
- Mail account rows are upserted by `mailAddress`, so repeated sync calls are safe.
- User Center grants `chemvault_mail` service access plus `mail:access`, `mail:send`, and `mail:receive` according to the Mail account flags.
- Every sync writes an `audit_logs` entry with action `mail_system.user_sync`.

Configure Mail Worker with:

```bash
npx wrangler secret put USER_SYSTEM_SYNC_SECRET --config mail-worker/wrangler.toml
```

The value must be identical to the User Center `MAIL_SYSTEM_SYNC_SECRET`. `chemvault_user_sync_url` may remain the default production endpoint unless you are testing against a local User Center.

Mail users can also use their ChemVault Mail password on the User Center email/password login form. User Center first verifies its local password hash, then any locally stored external Mail credential, then delegates to the protected Mail Worker endpoint:

```text
POST https://mail.chemvault.science/api/internal/user-center/password-login
```

This delegation is server-to-server only and uses the same shared Mail SSO/sync secret. User Center does not store or expose the submitted Mail password.

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

- `GET /api/auth/register-options`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/sso/mail/options`
- `GET /api/auth/sso/mail/start`
- `POST /api/auth/sso/mail/start`
- `GET /api/auth/sso/mail/callback`
- `POST /api/auth/sso/mail/callback`

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
- `POST /api/integrations/mail/users/sync`

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
- Login as a linked mail-system user with the existing mail password.
- Open `/api/auth/sso/mail/start` and confirm it redirects to the mail SSO URL, or back to login with `sso=mail_not_configured` if the URL is intentionally unset.
- Open `/api/auth/sso/apple/start` and confirm it redirects to Apple when Apple variables are configured, or back to login with `sso=apple_not_configured` if credentials are intentionally unset.
- Open `/api/auth/sso/google/start`, `/api/auth/sso/microsoft/start`, and `/api/auth/sso/github/start` and confirm each redirects to the provider when credentials are configured, or back to login with `{provider}_not_configured` if credentials are intentionally unset.
- After configuring providers, confirm callbacks use `/api/auth/sso/{provider}/callback`, create or bind a ChemVault user, and set the normal `chemvault_session` cookie.
- From `/settings/security`, bind and unlink Google, Microsoft, and GitHub. Confirm unlinking the final available login method is blocked.
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
- Do not commit `JWT_SECRET`, `MAIL_SYSTEM_SYNC_SECRET`, mail API keys, Apple private keys, or generated admin SQL.
- Do not commit `MAIL_SYSTEM_SSO_SECRET`, imported mail password hashes, imported salts, or generated mail credential import SQL.
- Do not commit `APPLE_PRIVATE_KEY`, Apple key downloads, Apple client secrets, callback codes, or captured Apple `id_token` values.
- `owner` cannot be downgraded or deleted through admin APIs.
- Ordinary admins cannot modify protected `super_admin`/`owner` accounts.
- All admin permission, mail, role, and status operations write audit logs.
- R2 avatar upload is still a TODO; profile currently stores `avatarUrl`.
