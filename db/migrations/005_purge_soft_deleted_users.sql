PRAGMA foreign_keys = ON;

-- Converts legacy soft-deleted users into a single deletion audit record,
-- then physically removes the user and user-scoped records so the same
-- email or OAuth identity can sign up again.

DELETE FROM audit_logs
WHERE actor_user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted')
   OR target_user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

INSERT INTO audit_logs (
  id, actor_user_id, target_user_id, action, resource_type, resource_id,
  details, ip, user_agent, created_at
)
SELECT
  'audit_' || lower(hex(randomblob(16))),
  NULL,
  id,
  'user.delete.legacy_cleanup',
  'user',
  id,
  json_object(
    'deletedUser',
    json_object(
      'id', id,
      'email', email,
      'name', name,
      'role', role,
      'systemRole', COALESCE(system_role, 'user'),
      'source', COALESCE(source, 'local'),
      'status', status,
      'globalStatus', COALESCE(global_status, status)
    ),
    'deletionMode',
    'legacy_soft_deleted_cleanup'
  ),
  NULL,
  NULL,
  datetime('now')
FROM users
WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted';

DELETE FROM sessions
WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

DELETE FROM external_identities
WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

DELETE FROM mail_accounts
WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

DELETE FROM connected_services
WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

DELETE FROM usage_logs
WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

DELETE FROM user_permissions
WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

DELETE FROM service_access
WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

DELETE FROM page_access
WHERE user_id IN (SELECT id FROM users WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted');

DELETE FROM users
WHERE status = 'deleted' OR COALESCE(global_status, status) = 'deleted';
