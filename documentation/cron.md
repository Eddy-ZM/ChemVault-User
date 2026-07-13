# Scheduled Work

| Job | Schedule | Endpoint/secret | Limits/retry | Idempotency/evidence |
| --- | --- | --- | --- | --- |
| Lifecycle reconciliation | Every 10 minutes | Pages-origin internal reconcile endpoint with `LIFECYCLE_RECONCILE_SECRET` | Bounded batch; retries failed jobs older than five minutes; concurrent runs disabled | Terminal jobs are skipped; D1 job state and GitHub Actions history show results |

The workflow fails if its secret or origin is missing. Service failures remain in retryable state and never advance local deletion to complete. Operators review repeated failures and the required-service quorum before manual retry or policy changes.
