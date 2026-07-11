CREATE TABLE IF NOT EXISTS lifecycle_jobs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('export', 'delete')),
  subject_user_id TEXT NOT NULL,
  actor_user_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  service_results_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_jobs_subject_created
  ON lifecycle_jobs(subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_jobs_status_updated
  ON lifecycle_jobs(status, updated_at DESC);
