# Verification Map

## Existing coverage

| Use case | Rule/negative case | Evidence | Status |
| --- | --- | --- | --- |
| Password/SSO/session | Active account only; invalid/non-active state creates no authority | auth/provider/session tests | CI required |
| Permission evaluation | Role/user/service/page grants fail closed; Mail permissions excluded | permission tests | CI required |
| Product handoff | Audience/expiry/access/return target verified | handoff and Lab routing tests | CI required |
| Mail onboarding | Explicit profile capture and bind/apply decisions | route/component/API tests | CI required |
| Distributed lifecycle | Billing plus all data services, retry, terminal status, and all non-active states | lifecycle tests | CI required |

## Proposed tests

| Test | Type | Expected result |
| --- | --- | --- |
| Six-service deletion/export canary | Guarded live | Every required service reaches terminal state before local deletion |
| OAuth provider matrix | Guarded live | Callback/nonce/state/account-state rules hold for every configured provider |
| Admin grant review | Manual release | Every elevated grant has owner, purpose, expiry, and audit event |

## Gaps

- Provider-console callbacks and distributed service secrets cannot be proven by local CI.
- PII minimization of production audit/tombstone data requires periodic data review.
- CI gates full Vitest and production build; scheduled reconciliation requires Actions history/canary evidence.

## Billing identity

Billing identity tests cover the dedicated service secret, email normalization, minimal canonical response, and rejection of invalid, missing, disabled, or globally inactive users.
