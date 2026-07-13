# Critical Flows

| Flow | Actor/precondition | Protected steps/side effects | Deny/failure behavior |
| --- | --- | --- | --- |
| Password/SSO login | Active account and valid credential/provider result | Validate both statuses/provider state, rotate/create session, load effective access | Any non-active state denied; failed callback creates no session |
| Mail onboarding | Newly authenticated user without binding | Refresh identity, collect explicit name/institution, bind existing mailbox or submit application | Credential profile values are not silently reused; existing binding skips duplicate flow |
| Product handoff | Signed-in user with service access | Validate service grant, audience, expiry and return target; sign bounded handoff | Missing grant/inactive account/untrusted return target denied |
| Permission/admin change | Authorized admin | Recompute role/user grants, persist audit event, revoke stale access where required | Non-admin/self-escalation denied; Mail roles remain Mail-owned |
| Account delete | User/admin according to policy | Mark deletion-pending, revoke sessions, create per-service jobs, call required services, remove local user last | Partial failure remains visible/retryable; no false-complete state |
| Reconciliation | Scheduled workflow with secret | Retry bounded failed jobs older than five minutes and persist result | Missing secret denied; concurrent run disabled; terminal jobs not replayed |
