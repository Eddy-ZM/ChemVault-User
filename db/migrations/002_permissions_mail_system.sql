PRAGMA foreign_keys = ON;

-- D1/SQLite ALTER TABLE ADD COLUMN should be applied once.
-- The CREATE TABLE and INSERT OR IGNORE statements below are safe to re-run.
ALTER TABLE users ADD COLUMN system_role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN source TEXT DEFAULT 'local';
ALTER TABLE users ADD COLUMN global_status TEXT DEFAULT 'active';

UPDATE users SET system_role = 'admin' WHERE role = 'admin' AND (system_role IS NULL OR system_role = 'user');
UPDATE users SET source = 'local' WHERE source IS NULL;
UPDATE users SET global_status = status WHERE global_status IS NULL;

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  effect TEXT NOT NULL DEFAULT 'allow' CHECK (effect IN ('allow', 'deny')),
  granted_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_user_key ON user_permissions(user_id, permission_key);
CREATE INDEX IF NOT EXISTS idx_user_permissions_key ON user_permissions(permission_key);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  system_role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  effect TEXT NOT NULL DEFAULT 'allow' CHECK (effect IN ('allow', 'deny')),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_role_key ON role_permissions(system_role, permission_key);

CREATE TABLE IF NOT EXISTS service_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'suspended')),
  granted_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_access_user_service ON service_access(user_id, service_key);

CREATE TABLE IF NOT EXISTS page_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'suspended')),
  granted_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_access_user_page ON page_access(user_id, page_key);

CREATE TABLE IF NOT EXISTS mail_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mail_address TEXT UNIQUE NOT NULL,
  mail_display_name TEXT,
  mail_role TEXT NOT NULL DEFAULT 'mailbox_user' CHECK (mail_role IN ('mailbox_user', 'mailbox_admin', 'mailbox_super')),
  mail_status TEXT NOT NULL DEFAULT 'active' CHECK (mail_status IN ('active', 'disabled', 'suspended', 'deleted')),
  can_send INTEGER NOT NULL DEFAULT 1,
  can_receive INTEGER NOT NULL DEFAULT 1,
  can_login_mail INTEGER NOT NULL DEFAULT 1,
  mailbox_quota_mb INTEGER NOT NULL DEFAULT 1024,
  aliases TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mail_accounts_user ON mail_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_accounts_status ON mail_accounts(mail_status);

CREATE TABLE IF NOT EXISTS mail_admin_sync (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  mail_role TEXT NOT NULL CHECK (mail_role IN ('super', 'admin')),
  display_name TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  synced_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_admin_sync_email_role ON mail_admin_sync(email, mail_role);

CREATE TABLE IF NOT EXISTS admin_sync_logs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  target_user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

INSERT OR IGNORE INTO permissions (id, key, name, description, category, created_at) VALUES
('perm_service_chemvault_main_access', 'service:chemvault_main:access', 'service / chemvault main / access', 'Allows service:chemvault_main:access.', 'service', datetime('now')),
('perm_service_chemvault_user_access', 'service:chemvault_user:access', 'service / chemvault user / access', 'Allows service:chemvault_user:access.', 'service', datetime('now')),
('perm_service_chemvault_mail_access', 'service:chemvault_mail:access', 'service / chemvault mail / access', 'Allows service:chemvault_mail:access.', 'service', datetime('now')),
('perm_service_chemvault_file_access', 'service:chemvault_file:access', 'service / chemvault file / access', 'Allows service:chemvault_file:access.', 'service', datetime('now')),
('perm_service_chemvault_docs_access', 'service:chemvault_docs:access', 'service / chemvault docs / access', 'Allows service:chemvault_docs:access.', 'service', datetime('now')),
('perm_service_chemvault_model_access', 'service:chemvault_model:access', 'service / chemvault model / access', 'Allows service:chemvault_model:access.', 'service', datetime('now')),
('perm_service_chemvault_extract_access', 'service:chemvault_extract:access', 'service / chemvault extract / access', 'Allows service:chemvault_extract:access.', 'service', datetime('now')),
('perm_service_chemvault_molecule_access', 'service:chemvault_molecule:access', 'service / chemvault molecule / access', 'Allows service:chemvault_molecule:access.', 'service', datetime('now')),
('perm_service_chemvault_notif_access', 'service:chemvault_notif:access', 'service / chemvault notif / access', 'Allows service:chemvault_notif:access.', 'service', datetime('now')),
('perm_service_chemvault_admin_access', 'service:chemvault_admin:access', 'service / chemvault admin / access', 'Allows service:chemvault_admin:access.', 'service', datetime('now')),
('perm_page_dashboard_view', 'page:dashboard:view', 'page / dashboard / view', 'Allows page:dashboard:view.', 'page', datetime('now')),
('perm_page_profile_view', 'page:profile:view', 'page / profile / view', 'Allows page:profile:view.', 'page', datetime('now')),
('perm_page_profile_edit', 'page:profile:edit', 'page / profile / edit', 'Allows page:profile:edit.', 'page', datetime('now')),
('perm_page_security_view', 'page:security:view', 'page / security / view', 'Allows page:security:view.', 'page', datetime('now')),
('perm_page_security_edit', 'page:security:edit', 'page / security / edit', 'Allows page:security:edit.', 'page', datetime('now')),
('perm_page_plan_view', 'page:plan:view', 'page / plan / view', 'Allows page:plan:view.', 'page', datetime('now')),
('perm_page_admin_view', 'page:admin:view', 'page / admin / view', 'Allows page:admin:view.', 'page', datetime('now')),
('perm_page_admin_users_view', 'page:admin_users:view', 'page / admin users / view', 'Allows page:admin_users:view.', 'page', datetime('now')),
('perm_page_admin_users_edit', 'page:admin_users:edit', 'page / admin users / edit', 'Allows page:admin_users:edit.', 'page', datetime('now')),
('perm_page_admin_permissions_view', 'page:admin_permissions:view', 'page / admin permissions / view', 'Allows page:admin_permissions:view.', 'page', datetime('now')),
('perm_page_admin_permissions_edit', 'page:admin_permissions:edit', 'page / admin permissions / edit', 'Allows page:admin_permissions:edit.', 'page', datetime('now')),
('perm_page_admin_mail_view', 'page:admin_mail:view', 'page / admin mail / view', 'Allows page:admin_mail:view.', 'page', datetime('now')),
('perm_page_admin_mail_edit', 'page:admin_mail:edit', 'page / admin mail / edit', 'Allows page:admin_mail:edit.', 'page', datetime('now')),
('perm_page_model_view', 'page:model:view', 'page / model / view', 'Allows page:model:view.', 'page', datetime('now')),
('perm_page_file_view', 'page:file:view', 'page / file / view', 'Allows page:file:view.', 'page', datetime('now')),
('perm_page_docs_view', 'page:docs:view', 'page / docs / view', 'Allows page:docs:view.', 'page', datetime('now')),
('perm_page_extract_view', 'page:extract:view', 'page / extract / view', 'Allows page:extract:view.', 'page', datetime('now')),
('perm_page_molecule_view', 'page:molecule:view', 'page / molecule / view', 'Allows page:molecule:view.', 'page', datetime('now')),
('perm_page_notif_view', 'page:notif:view', 'page / notif / view', 'Allows page:notif:view.', 'page', datetime('now')),
('perm_file_read', 'file:read', 'file / read', 'Allows file:read.', 'file', datetime('now')),
('perm_file_upload', 'file:upload', 'file / upload', 'Allows file:upload.', 'file', datetime('now')),
('perm_file_delete', 'file:delete', 'file / delete', 'Allows file:delete.', 'file', datetime('now')),
('perm_file_share', 'file:share', 'file / share', 'Allows file:share.', 'file', datetime('now')),
('perm_file_admin', 'file:admin', 'file / admin', 'Allows file:admin.', 'file', datetime('now')),
('perm_file_private_access', 'file:private_access', 'file / private access', 'Allows file:private_access.', 'file', datetime('now')),
('perm_file_public_manage', 'file:public_manage', 'file / public manage', 'Allows file:public_manage.', 'file', datetime('now')),
('perm_docs_read', 'docs:read', 'docs / read', 'Allows docs:read.', 'docs', datetime('now')),
('perm_docs_create', 'docs:create', 'docs / create', 'Allows docs:create.', 'docs', datetime('now')),
('perm_docs_edit', 'docs:edit', 'docs / edit', 'Allows docs:edit.', 'docs', datetime('now')),
('perm_docs_delete', 'docs:delete', 'docs / delete', 'Allows docs:delete.', 'docs', datetime('now')),
('perm_docs_publish', 'docs:publish', 'docs / publish', 'Allows docs:publish.', 'docs', datetime('now')),
('perm_docs_admin', 'docs:admin', 'docs / admin', 'Allows docs:admin.', 'docs', datetime('now')),
('perm_model_view', 'model:view', 'model / view', 'Allows model:view.', 'model', datetime('now')),
('perm_model_create', 'model:create', 'model / create', 'Allows model:create.', 'model', datetime('now')),
('perm_model_edit', 'model:edit', 'model / edit', 'Allows model:edit.', 'model', datetime('now')),
('perm_model_delete', 'model:delete', 'model / delete', 'Allows model:delete.', 'model', datetime('now')),
('perm_model_run', 'model:run', 'model / run', 'Allows model:run.', 'model', datetime('now')),
('perm_model_admin', 'model:admin', 'model / admin', 'Allows model:admin.', 'model', datetime('now')),
('perm_mail_access', 'mail:access', 'mail / access', 'Allows mail:access.', 'mail', datetime('now')),
('perm_mail_send', 'mail:send', 'mail / send', 'Allows mail:send.', 'mail', datetime('now')),
('perm_mail_receive', 'mail:receive', 'mail / receive', 'Allows mail:receive.', 'mail', datetime('now')),
('perm_mail_manage_alias', 'mail:manage_alias', 'mail / manage alias', 'Allows mail:manage_alias.', 'mail', datetime('now')),
('perm_mail_manage_quota', 'mail:manage_quota', 'mail / manage quota', 'Allows mail:manage_quota.', 'mail', datetime('now')),
('perm_mail_admin', 'mail:admin', 'mail / admin', 'Allows mail:admin.', 'mail', datetime('now')),
('perm_mail_super', 'mail:super', 'mail / super', 'Allows mail:super.', 'mail', datetime('now')),
('perm_admin_users_view', 'admin:users:view', 'admin / users / view', 'Allows admin:users:view.', 'admin', datetime('now')),
('perm_admin_users_create', 'admin:users:create', 'admin / users / create', 'Allows admin:users:create.', 'admin', datetime('now')),
('perm_admin_users_edit', 'admin:users:edit', 'admin / users / edit', 'Allows admin:users:edit.', 'admin', datetime('now')),
('perm_admin_users_disable', 'admin:users:disable', 'admin / users / disable', 'Allows admin:users:disable.', 'admin', datetime('now')),
('perm_admin_users_delete', 'admin:users:delete', 'admin / users / delete', 'Allows admin:users:delete.', 'admin', datetime('now')),
('perm_admin_permissions_view', 'admin:permissions:view', 'admin / permissions / view', 'Allows admin:permissions:view.', 'admin', datetime('now')),
('perm_admin_permissions_edit', 'admin:permissions:edit', 'admin / permissions / edit', 'Allows admin:permissions:edit.', 'admin', datetime('now')),
('perm_admin_roles_edit', 'admin:roles:edit', 'admin / roles / edit', 'Allows admin:roles:edit.', 'admin', datetime('now')),
('perm_admin_mail_view', 'admin:mail:view', 'admin / mail / view', 'Allows admin:mail:view.', 'admin', datetime('now')),
('perm_admin_mail_edit', 'admin:mail:edit', 'admin / mail / edit', 'Allows admin:mail:edit.', 'admin', datetime('now')),
('perm_admin_services_view', 'admin:services:view', 'admin / services / view', 'Allows admin:services:view.', 'admin', datetime('now')),
('perm_admin_services_edit', 'admin:services:edit', 'admin / services / edit', 'Allows admin:services:edit.', 'admin', datetime('now')),
('perm_admin_audit_view', 'admin:audit:view', 'admin / audit / view', 'Allows admin:audit:view.', 'admin', datetime('now')),
('perm_admin_system_settings_edit', 'admin:system_settings:edit', 'admin / system settings / edit', 'Allows admin:system_settings:edit.', 'admin', datetime('now')),
('perm_api_read', 'api:read', 'api / read', 'Allows api:read.', 'api', datetime('now')),
('perm_api_write', 'api:write', 'api / write', 'Allows api:write.', 'api', datetime('now')),
('perm_api_admin', 'api:admin', 'api / admin', 'Allows api:admin.', 'api', datetime('now')),
('perm_api_key_create', 'api:key:create', 'api / key / create', 'Allows api:key:create.', 'api', datetime('now')),
('perm_api_key_revoke', 'api:key:revoke', 'api / key / revoke', 'Allows api:key:revoke.', 'api', datetime('now'));

INSERT OR IGNORE INTO permissions (id, key, name, description, category, created_at) VALUES
('perm_service_chemvault_app_access', 'service:chemvault_app:access', 'service / chemvault app / access', 'Allows service:chemvault_app:access.', 'service', datetime('now')),
('perm_page_admin_services_view', 'page:admin_services:view', 'page / admin services / view', 'Allows page:admin_services:view.', 'page', datetime('now')),
('perm_page_admin_services_edit', 'page:admin_services:edit', 'page / admin services / edit', 'Allows page:admin_services:edit.', 'page', datetime('now')),
('perm_page_admin_audit_view', 'page:admin_audit:view', 'page / admin audit / view', 'Allows page:admin_audit:view.', 'page', datetime('now'));

INSERT OR IGNORE INTO role_permissions (id, system_role, permission_key, effect, created_at) VALUES
('rp_user_page_dashboard_view', 'user', 'page:dashboard:view', 'allow', datetime('now')),
('rp_user_page_profile_view', 'user', 'page:profile:view', 'allow', datetime('now')),
('rp_user_page_profile_edit', 'user', 'page:profile:edit', 'allow', datetime('now')),
('rp_user_page_security_view', 'user', 'page:security:view', 'allow', datetime('now')),
('rp_user_page_security_edit', 'user', 'page:security:edit', 'allow', datetime('now')),
('rp_user_page_plan_view', 'user', 'page:plan:view', 'allow', datetime('now')),
('rp_staff_page_dashboard_view', 'staff', 'page:dashboard:view', 'allow', datetime('now')),
('rp_staff_page_profile_view', 'staff', 'page:profile:view', 'allow', datetime('now')),
('rp_staff_page_profile_edit', 'staff', 'page:profile:edit', 'allow', datetime('now')),
('rp_staff_page_security_view', 'staff', 'page:security:view', 'allow', datetime('now')),
('rp_staff_page_security_edit', 'staff', 'page:security:edit', 'allow', datetime('now')),
('rp_staff_page_plan_view', 'staff', 'page:plan:view', 'allow', datetime('now')),
('rp_staff_service_docs', 'staff', 'service:chemvault_docs:access', 'allow', datetime('now')),
('rp_staff_service_file', 'staff', 'service:chemvault_file:access', 'allow', datetime('now')),
('rp_staff_docs_read', 'staff', 'docs:read', 'allow', datetime('now')),
('rp_staff_file_read', 'staff', 'file:read', 'allow', datetime('now')),
('rp_service_admin_page_dashboard_view', 'service_admin', 'page:dashboard:view', 'allow', datetime('now')),
('rp_service_admin_page_profile_view', 'service_admin', 'page:profile:view', 'allow', datetime('now')),
('rp_service_admin_page_security_view', 'service_admin', 'page:security:view', 'allow', datetime('now')),
('rp_service_admin_page_plan_view', 'service_admin', 'page:plan:view', 'allow', datetime('now')),
('rp_admin_page_dashboard_view', 'admin', 'page:dashboard:view', 'allow', datetime('now')),
('rp_admin_page_profile_view', 'admin', 'page:profile:view', 'allow', datetime('now')),
('rp_admin_page_profile_edit', 'admin', 'page:profile:edit', 'allow', datetime('now')),
('rp_admin_page_security_view', 'admin', 'page:security:view', 'allow', datetime('now')),
('rp_admin_page_security_edit', 'admin', 'page:security:edit', 'allow', datetime('now')),
('rp_admin_page_plan_view', 'admin', 'page:plan:view', 'allow', datetime('now')),
('rp_admin_page_admin_view', 'admin', 'page:admin:view', 'allow', datetime('now')),
('rp_admin_page_admin_users_view', 'admin', 'page:admin_users:view', 'allow', datetime('now')),
('rp_admin_page_admin_users_edit', 'admin', 'page:admin_users:edit', 'allow', datetime('now')),
('rp_admin_page_admin_permissions_view', 'admin', 'page:admin_permissions:view', 'allow', datetime('now')),
('rp_admin_page_admin_permissions_edit', 'admin', 'page:admin_permissions:edit', 'allow', datetime('now')),
('rp_admin_page_admin_mail_view', 'admin', 'page:admin_mail:view', 'allow', datetime('now')),
('rp_admin_page_admin_mail_edit', 'admin', 'page:admin_mail:edit', 'allow', datetime('now')),
('rp_admin_page_admin_services_view', 'admin', 'page:admin_services:view', 'allow', datetime('now')),
('rp_admin_page_admin_services_edit', 'admin', 'page:admin_services:edit', 'allow', datetime('now')),
('rp_admin_page_admin_audit_view', 'admin', 'page:admin_audit:view', 'allow', datetime('now')),
('rp_admin_service_admin', 'admin', 'service:chemvault_admin:access', 'allow', datetime('now')),
('rp_admin_users_view', 'admin', 'admin:users:view', 'allow', datetime('now')),
('rp_admin_users_create', 'admin', 'admin:users:create', 'allow', datetime('now')),
('rp_admin_users_edit', 'admin', 'admin:users:edit', 'allow', datetime('now')),
('rp_admin_permissions_view', 'admin', 'admin:permissions:view', 'allow', datetime('now')),
('rp_admin_permissions_edit', 'admin', 'admin:permissions:edit', 'allow', datetime('now')),
('rp_admin_mail_view', 'admin', 'admin:mail:view', 'allow', datetime('now')),
('rp_admin_mail_edit', 'admin', 'admin:mail:edit', 'allow', datetime('now')),
('rp_admin_services_view', 'admin', 'admin:services:view', 'allow', datetime('now')),
('rp_admin_services_edit', 'admin', 'admin:services:edit', 'allow', datetime('now')),
('rp_admin_audit_view', 'admin', 'admin:audit:view', 'allow', datetime('now'));
