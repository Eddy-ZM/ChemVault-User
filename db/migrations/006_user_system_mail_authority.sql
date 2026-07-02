-- User Center is the only authorization source for ChemVault Mail access.
-- Legacy Mail sync/binding wrote these records with granted_by = NULL.
-- Admin-created User Center grants keep their actor id and are preserved.

DELETE FROM user_permissions
WHERE granted_by IS NULL
  AND permission_key IN ('mail:access', 'mail:send', 'mail:receive');

DELETE FROM service_access
WHERE granted_by IS NULL
  AND service_key = 'chemvault_mail';

UPDATE mail_accounts
SET can_send = 1,
    can_receive = 1,
    can_login_mail = 1,
    updated_at = datetime('now')
WHERE mail_status != 'deleted';
