PRAGMA foreign_keys = OFF;

CREATE TABLE users_v2 (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  institution TEXT,
  field_of_interest TEXT,
  bio TEXT,
  website TEXT,
  role TEXT NOT NULL DEFAULT 'free' CHECK (role IN ('free', 'pro', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deletion_pending', 'disabled', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT,
  system_role TEXT DEFAULT 'user',
  source TEXT DEFAULT 'local',
  global_status TEXT DEFAULT 'active'
);

INSERT INTO users_v2 (
  id, email, password_hash, name, avatar_url, institution, field_of_interest,
  bio, website, role, status, created_at, updated_at, last_login_at,
  system_role, source, global_status
)
SELECT
  id, email, password_hash, name, avatar_url, institution, field_of_interest,
  bio, website, role, status, created_at, updated_at, last_login_at,
  system_role, source, global_status
FROM users;

DROP TABLE users;
ALTER TABLE users_v2 RENAME TO users;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

PRAGMA foreign_keys = ON;
