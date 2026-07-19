-- Restore the original service-entry gate after migration 013 temporarily
-- presented it as the operational restriction.
UPDATE permissions
SET
  name = 'University of Manchester Student Representative Mail System',
  description = 'Allows the user to access the University of Manchester Student Representative Mail System and create official Student Representative announcements.',
  category = 'service'
WHERE key = 'service:uom-su-mail-system:access';

-- Content access is deliberately separate from service entry. Existing
-- service-entry decisions must not be copied into this permission.
INSERT OR IGNORE INTO permissions (id, key, name, description, category, created_at) VALUES
(
  'perm_feature_uom_su_mail_system_full_access',
  'feature:uom-su-mail-system:full_access',
  'Access restriction',
  'Deny restricts the principal workspace and all archive operations. Allow grants full service access. Public pages remain available in either state.',
  'feature',
  datetime('now')
);

UPDATE permissions
SET
  name = 'Access restriction',
  description = 'Deny restricts the principal workspace and all archive operations. Allow grants full service access. Public pages remain available in either state.',
  category = 'feature'
WHERE key = 'feature:uom-su-mail-system:full_access';

-- The content permission is explicit-only, including for owner and super-admin
-- roles. Remove any role grant without changing per-user decisions.
DELETE FROM role_permissions
WHERE permission_key = 'feature:uom-su-mail-system:full_access';

-- Bootstrap both approved identities without overwriting an explicit user
-- decision. The distinct ID prefix keeps this grant independent of entry access.
INSERT OR IGNORE INTO user_permissions (
  id,
  user_id,
  permission_key,
  effect,
  granted_by,
  created_at
)
SELECT
  'uperm_uom_su_full_access_bootstrap_' || id,
  id,
  'feature:uom-su-mail-system:full_access',
  'allow',
  NULL,
  datetime('now')
FROM users
WHERE lower(trim(email)) IN (
  'ziwen.mu@chemvault.science',
  'test@chemvault.science'
);
