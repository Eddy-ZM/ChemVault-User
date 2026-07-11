# Critical flows

1. Password or SSO validates an active user and creates a revocable session.
2. A service handoff verifies audience, expiry, active account state, and access grants.
3. Account deletion first changes the user to `deletion_pending`, revokes sessions, then requests deletion from Files, Lab, Notifications, Mail, and Extract.
4. Failed deletion jobs remain visible to administrators and may be retried; the local user is removed only after every required service confirms completion.
5. A scheduler may call the secret-protected reconciliation endpoint; it retries failed deletion jobs older than five minutes in bounded batches.
