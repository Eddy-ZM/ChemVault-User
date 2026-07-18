-- UoM Student Representative Mail System access is explicit-only. Role grants
-- never confer access, including owner and super-admin role grants.
DELETE FROM role_permissions
WHERE permission_key = 'service:uom-su-mail-system:access';

-- Bootstrap the existing Ziwen account without overwriting an explicit deny (or
-- any other deliberate per-user decision). Future registrations are covered by
-- the same email-identity rule in the runtime permission evaluator.
INSERT OR IGNORE INTO user_permissions (
  id,
  user_id,
  permission_key,
  effect,
  granted_by,
  created_at
)
SELECT
  'uperm_uom_su_bootstrap_' || id,
  id,
  'service:uom-su-mail-system:access',
  'allow',
  NULL,
  datetime('now')
FROM users
WHERE lower(trim(email)) = 'ziwen.mu@chemvault.science';
