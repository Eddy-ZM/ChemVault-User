-- Historical cleanup for legacy Mail grants that were written before Mail role authority was clarified.
-- Full removal of User Center Mail runtime grants happens in 007_mail_role_authority.sql.
-- Non-Mail service, page, and feature permissions remain managed by User Center.

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
