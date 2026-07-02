-- ChemVault Mail send/receive/login authority follows Mail System role assignment.
-- User Center keeps mailbox binding and mail_role metadata but does not grant Mail runtime access.

DELETE FROM user_permissions
WHERE permission_key LIKE 'mail:%'
   OR permission_key = 'service:chemvault_mail:access';

DELETE FROM role_permissions
WHERE permission_key LIKE 'mail:%'
   OR permission_key = 'service:chemvault_mail:access';

DELETE FROM service_access
WHERE service_key = 'chemvault_mail';

DELETE FROM permissions
WHERE key LIKE 'mail:%'
   OR key = 'service:chemvault_mail:access';

UPDATE mail_accounts
SET can_send = 1,
    can_receive = 1,
    can_login_mail = 1,
    updated_at = datetime('now')
WHERE mail_status != 'deleted';
