CREATE TABLE IF NOT EXISTS external_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  provider_email TEXT NOT NULL,
  credential_hash TEXT,
  credential_salt TEXT,
  credential_algorithm TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_identities_provider_email
  ON external_identities(provider, provider_email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_identities_provider_user_id
  ON external_identities(provider, provider_user_id)
  WHERE provider_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_identities_user_id
  ON external_identities(user_id);
