# Permissions

| Operation | Active user | Service owner/admin | Super admin | Machine lifecycle service | Non-active account |
| --- | --- | --- | --- | --- | --- |
| View/update own profile | Allow bounded fields | Audited support | Allow | Deny | Deny |
| Create/revoke own sessions | Allow | Audited support | Allow | Deny | Revoked/deny |
| Access registered service | Only effective grant | Configure owned service | Configure | Handoff/lifecycle scope | Deny |
| Assign generic roles/grants | Deny | Owned scope only | Allow | Deny | Deny |
| Assign Mail permissions | Deny | Deny; Mail-owned | Deny through generic API | Deny | Deny |
| Manage/retry lifecycle | Own request status | Explicit admin | Allow | Reconcile credential | Deny |

Effective permission is the intersection of active account state, role/user grants, service registration, and page/resource rules. UI route visibility is not authorization.
