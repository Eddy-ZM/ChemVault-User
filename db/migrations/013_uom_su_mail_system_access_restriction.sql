-- Present the existing explicit service gate as the operational access
-- restriction requested for the pre-approval period.
UPDATE permissions
SET
  name = 'Access restriction',
  description = 'Deny restricts the principal workspace and all archive operations. Allow grants full service access. Public pages remain available in either state.'
WHERE key = 'service:uom-su-mail-system:access';

-- Bootstrap both approved ChemVault test identities without replacing any
-- explicit administrator decision already stored for either account.
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
WHERE lower(trim(email)) IN (
  'ziwen.mu@chemvault.science',
  'test@chemvault.science'
);
