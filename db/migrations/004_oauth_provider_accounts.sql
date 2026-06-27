PRAGMA foreign_keys = ON;

-- Apply this migration after db/migrations/003_external_identities_sso.sql.
-- D1/SQLite ALTER TABLE ADD COLUMN statements are intended to run once.
-- Runtime OAuth code does not use third-party tokens as ChemVault credentials.

ALTER TABLE external_identities ADD COLUMN access_token TEXT;
ALTER TABLE external_identities ADD COLUMN refresh_token TEXT;
ALTER TABLE external_identities ADD COLUMN expires_at TEXT;
ALTER TABLE external_identities ADD COLUMN avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_external_identities_provider
  ON external_identities(provider);
