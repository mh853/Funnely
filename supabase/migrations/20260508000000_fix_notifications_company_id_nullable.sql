-- Fix: notifications.company_id was NOT NULL, causing trigger_notify_admins_new_public_inquiry
-- to fail when inserting system-level notifications (e.g. from public inquiry submissions)
-- that are not associated with any specific company.
ALTER TABLE notifications ALTER COLUMN company_id DROP NOT NULL;
