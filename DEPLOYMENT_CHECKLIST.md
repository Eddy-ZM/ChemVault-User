# ChemVault User Center Deployment Checklist

Target domain: `https://user.chemvault.science`

## Automated Preparation

- [x] Verified React/Vite build outputs to `dist`.
- [x] Verified Cloudflare Pages Functions live under `functions/`.
- [x] Verified D1 binding name is `DB`.
- [x] Verified R2 avatar binding name is `AVATARS`.
- [x] Verified cookie name is `chemvault_session`.
- [x] Verified `JWT_SECRET` is not hardcoded.
- [x] Added SPA fallback in `public/_redirects`.
- [x] Created production D1 database `chemvault_user`.
- [x] Updated `wrangler.toml` with production D1 database id.
- [x] Created production R2 bucket `chemvault-user-avatars`.
- [x] Created Cloudflare Pages project `chemvault-user`.

## Production Deployment

- [x] Apply production D1 schema.
- [x] Set production `JWT_SECRET`.
- [x] Deploy `dist` to Cloudflare Pages.
- [x] Configure Pages Functions D1 binding `DB` to `chemvault_user` via `wrangler.toml`.
- [x] Configure Pages Functions R2 binding `AVATARS` to `chemvault-user-avatars` via `wrangler.toml`.
- [x] Configure production variables via `wrangler.toml`:
  - `COOKIE_NAME=chemvault_session`
  - `NODE_ENV=production`
- [ ] Add custom domain `user.chemvault.science`.
- [ ] Confirm DNS CNAME `user -> chemvault-user.pages.dev` is proxied.
- [ ] Confirm SSL/TLS mode is Full or Full strict.
- [ ] Wait for Pages custom domain certificate issuance.
- [ ] Create a production admin account with a real email and strong password.

Current deployed URL before custom domain binding:

- `https://chemvault-user.pages.dev`
- latest deployment tested: `https://a296d966.chemvault-user.pages.dev`

## Page Smoke Tests

Smoke tested on `https://chemvault-user.pages.dev` before custom domain binding.

- [x] Open `/`.
- [x] Open `/login`.
- [x] Open `/register`.
- [x] Confirm `/dashboard` SPA fallback returns 200 before client auth redirect.
- [x] Confirm `/admin` SPA fallback returns 200 before client auth redirect.
- [x] Register a normal user.
- [x] Login as the normal user through cookie-backed registration session.
- [x] Confirm authenticated `/api/auth/me` returns the normal user.
- [ ] Update profile.
- [ ] Change password.
- [x] Logout.
- [x] Confirm normal user receives 403 from admin API.
- [x] Login as temporary admin smoke user.
- [x] Confirm temporary admin can access admin API.
- [x] Confirm admin stats API returns 200.
- [x] Clean up temporary admin smoke user.

## API Smoke Tests

- [x] `POST /api/auth/register` returned 201.
- [x] `POST /api/auth/login` returned 200 for temporary admin smoke user.
- [x] `GET /api/auth/me` with cookie returned 200.
- [x] `GET /api/user/usage` returned 200.
- [x] `GET /api/user/services` returned 200.
- [x] `POST /api/auth/logout` returned 200.
- [x] Normal user `GET /api/admin/users` returned 403.
- [x] Admin `GET /api/admin/users` returned 200.

Do not paste real cookies, session tokens, passwords, or `JWT_SECRET` into this file.
