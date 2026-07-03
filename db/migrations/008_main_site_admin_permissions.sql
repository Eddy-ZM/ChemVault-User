-- Main site Forms / Leads administrator permissions.
-- These permissions are consumed by chemvault.science admin routes in addition
-- to that site's CHEMVAULT_ADMIN_EMAILS allow-list.

INSERT OR IGNORE INTO permissions (id, key, name, description, category, created_at) VALUES
('perm_service_chemvault_main_admin_access', 'service:chemvault_main_admin:access', 'service / chemvault main admin / access', 'Allows access to the ChemVault main-site admin service.', 'service', datetime('now')),
('perm_page_main_admin_view', 'page:main_admin:view', 'page / main admin / view', 'Allows viewing the ChemVault main-site admin entry.', 'page', datetime('now')),
('perm_page_main_admin_forms_view', 'page:main_admin_forms:view', 'page / main admin forms / view', 'Allows viewing the ChemVault Forms admin page.', 'page', datetime('now')),
('perm_page_main_admin_leads_view', 'page:main_admin_leads:view', 'page / main admin leads / view', 'Allows viewing the ChemVault Leads admin page.', 'page', datetime('now')),
('perm_main_admin_access', 'main_admin:access', 'main admin / access', 'Allows entry to the ChemVault main-site admin interface after email allow-list validation.', 'main_admin', datetime('now')),
('perm_main_admin_forms_read', 'main_admin:forms:read', 'main admin / forms / read', 'Allows reading Forms and Feedback submissions on the main site.', 'main_admin', datetime('now')),
('perm_main_admin_forms_write', 'main_admin:forms:write', 'main admin / forms / write', 'Allows updating Forms and Feedback status, priority, assignment, and internal notes.', 'main_admin', datetime('now')),
('perm_main_admin_forms_reply', 'main_admin:forms:reply', 'main admin / forms / reply', 'Allows sending and saving email replies from the Forms admin workflow.', 'main_admin', datetime('now')),
('perm_main_admin_leads_read', 'main_admin:leads:read', 'main admin / leads / read', 'Allows reading Lead and Newsletter submissions on the main site.', 'main_admin', datetime('now')),
('perm_main_admin_leads_write', 'main_admin:leads:write', 'main admin / leads / write', 'Allows updating Lead and Newsletter status on the main site.', 'main_admin', datetime('now')),
('perm_main_admin_leads_notify', 'main_admin:leads:notify', 'main admin / leads / notify', 'Allows resending administrator lead notification emails.', 'main_admin', datetime('now')),
('perm_main_admin_compliance_read', 'main_admin:compliance:read', 'main admin / compliance / read', 'Allows reading account deletion and export request queues on the main site.', 'main_admin', datetime('now')),
('perm_main_admin_compliance_write', 'main_admin:compliance:write', 'main admin / compliance / write', 'Allows updating account deletion and export request queues on the main site.', 'main_admin', datetime('now'));

INSERT OR IGNORE INTO role_permissions (id, system_role, permission_key, effect, created_at) VALUES
('rp_admin_service_main_admin', 'admin', 'service:chemvault_main_admin:access', 'allow', datetime('now')),
('rp_admin_page_main_admin_view', 'admin', 'page:main_admin:view', 'allow', datetime('now')),
('rp_admin_page_main_admin_forms_view', 'admin', 'page:main_admin_forms:view', 'allow', datetime('now')),
('rp_admin_page_main_admin_leads_view', 'admin', 'page:main_admin_leads:view', 'allow', datetime('now')),
('rp_admin_main_admin_access', 'admin', 'main_admin:access', 'allow', datetime('now')),
('rp_admin_main_admin_forms_read', 'admin', 'main_admin:forms:read', 'allow', datetime('now')),
('rp_admin_main_admin_forms_write', 'admin', 'main_admin:forms:write', 'allow', datetime('now')),
('rp_admin_main_admin_forms_reply', 'admin', 'main_admin:forms:reply', 'allow', datetime('now')),
('rp_admin_main_admin_leads_read', 'admin', 'main_admin:leads:read', 'allow', datetime('now')),
('rp_admin_main_admin_leads_write', 'admin', 'main_admin:leads:write', 'allow', datetime('now')),
('rp_admin_main_admin_leads_notify', 'admin', 'main_admin:leads:notify', 'allow', datetime('now')),
('rp_admin_main_admin_compliance_read', 'admin', 'main_admin:compliance:read', 'allow', datetime('now')),
('rp_admin_main_admin_compliance_write', 'admin', 'main_admin:compliance:write', 'allow', datetime('now'));
