-- University of Manchester Student Representative Mail System access.
-- No default role grant is added: access must be assigned explicitly in User Center.

INSERT OR IGNORE INTO permissions (id, key, name, description, category, created_at) VALUES
(
  'perm_service_uom_su_mail_system_access',
  'service:uom-su-mail-system:access',
  'University of Manchester Student Representative Mail System',
  'Allows the user to access the University of Manchester Student Representative Mail System and create official Student Representative announcements.',
  'service',
  datetime('now')
);
