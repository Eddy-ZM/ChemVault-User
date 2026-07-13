# Architecture

ChemVault User is the suite identity, session, service-access, entitlement, handoff, and account-lifecycle control plane. React provides self-service/admin UI; Cloudflare Pages Functions implement password/SSO, sessions, permission evaluation, Mail onboarding, signed product handoffs, and distributed export/deletion. D1 stores users, grants, sessions, bindings, audit state, and lifecycle jobs.

## Trust boundaries

- Authentication succeeds only when both account-status dimensions are active; all non-active states receive no effective permissions.
- Service and page access are server-evaluated from role/user grants; clients cannot mint entitlements.
- Product handoffs bind audience, expiry, identity, destination, and allowed return path.
- Service-specific data stays in Files/Lab/Notifications/Mail/Extract; lifecycle uses dedicated service credentials and a required-service quorum.

## Known risks/assumptions

- Local User deletion is last, after every required service reaches a terminal result.
- Admin/super-admin grants are high impact and require audit/least privilege.
- Audit tombstones must minimize PII after deletion.

Scheduled lifecycle reconciliation is documented in `cron.md`. There is no email or embedded AI automation in this repository.

## Related documents

- [Flows](flows.md)
- [Permissions](permissions.md)
- [Variables](variables.md)
- [Tests](tests.md)
- [Scheduled lifecycle work](cron.md)
