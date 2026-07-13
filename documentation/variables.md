# Runtime Variables

| Name/group | Used by | Scope/source | Rotation | Failure/risk |
| --- | --- | --- | --- | --- |
| `JWT_SECRET` and session settings | User sessions/handoffs | Server secret/config | 90 days/incident | Auth/handoff fails; coordinate rotation |
| OAuth client IDs/secrets | Apple/Google/GitHub/etc. | Public IDs plus server secrets | Provider policy/incident | Provider login unavailable |
| Mail sync/SSO credentials | User ↔ Mail | Shared server secrets, distinct | 90 days/incident | Mail onboarding/sync unavailable |
| `LIFECYCLE_SERVICE_SECRET` | Inbound service lifecycle authority | Server secret | 90 days/incident | Service request denied |
| `LIFECYCLE_RECONCILE_SECRET` | Scheduled reconciliation | Pages/GitHub secret, distinct | 90 days/incident | Failed jobs stop retrying |
| Service lifecycle URLs/credentials | Outbound Files/Lab/Notif/Mail/Extract calls | Server config/secrets | Service migration/incident | Job remains failed/retryable |
| `LIFECYCLE_REQUIRED_SERVICES` | Deletion quorum | Server variable | Product boundary change | Wrong list can block or falsely complete deletion |
| D1 binding | Users/grants/audit/jobs | Cloudflare binding | Resource migration | Identity control plane unavailable |

No secret may be reused across JWT, OAuth, Mail, lifecycle, or reconciliation. Go-live requires provider callbacks, active-state regression, service registry/grants, required-service quorum, distributed canary, and PII-minimized tombstone review.
