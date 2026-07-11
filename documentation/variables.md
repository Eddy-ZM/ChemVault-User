# Runtime variables

Required secrets include `JWT_SECRET`, provider-specific OAuth secrets, `LIFECYCLE_SERVICE_SECRET`, `LIFECYCLE_RECONCILE_SECRET`, and service lifecycle URLs. Mail synchronization and SSO use separate credentials. `LIFECYCLE_REQUIRED_SERVICES` controls the fail-closed deletion quorum.

Secrets must be injected through the deployment secret store. They must not be committed or reused across JWT, lifecycle, Mail sync, and OAuth purposes.
