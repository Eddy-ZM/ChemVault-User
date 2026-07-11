# Architecture

ChemVault User is the identity and authorization control plane. Cloudflare Pages Functions expose password, SSO, session, permission, handoff, and distributed account-lifecycle APIs. D1 stores users, sessions, grants, mail bindings, audit records, and lifecycle jobs; the React application provides self-service and administration.

Authentication is allowed only when both account status dimensions are `active`. Service-specific data remains owned by each service and is coordinated through signed handoffs and dedicated lifecycle credentials.
