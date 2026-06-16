-- The Photizo Haven — Row-Level Security Policies
-- Run AFTER schema.sql. API must SET LOCAL app.* session vars per request.

-- ─── Enable RLS on all sensitive tables ──────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE giving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE giving_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (superuser bypass disabled in app role)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE giving_records FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_comments FORCE ROW LEVEL SECURITY;
ALTER TABLE member_feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- ─── users ───────────────────────────────────────────────────────────────────

-- Members: read/update own row only
CREATE POLICY users_member_select ON users
  FOR SELECT
  USING (
    current_app_user_role() = 'MEMBER'
    AND id = current_app_user_id()
  );

CREATE POLICY users_member_update ON users
  FOR UPDATE
  USING (id = current_app_user_id() AND current_app_user_role() = 'MEMBER')
  WITH CHECK (id = current_app_user_id() AND role = 'MEMBER');

-- Managers: read all members in their assigned group
CREATE POLICY users_manager_select ON users
  FOR SELECT
  USING (
    current_app_user_role() IN ('MANAGER', 'ADMIN')
    AND group_id = current_app_group_id()
  );

-- Admins: full group management
CREATE POLICY users_admin_all ON users
  FOR ALL
  USING (
    current_app_user_role() = 'ADMIN'
    AND group_id = current_app_group_id()
  )
  WITH CHECK (
    current_app_user_role() = 'ADMIN'
    AND group_id = current_app_group_id()
  );

-- ─── giving_records ──────────────────────────────────────────────────────────

CREATE POLICY giving_member_select ON giving_records
  FOR SELECT
  USING (user_id = current_app_user_id());

CREATE POLICY giving_member_insert ON giving_records
  FOR INSERT
  WITH CHECK (
    user_id = current_app_user_id()
    AND group_id = (SELECT group_id FROM users WHERE id = current_app_user_id())
  );

CREATE POLICY giving_manager_select ON giving_records
  FOR SELECT
  USING (
    current_app_user_role() IN ('MANAGER', 'ADMIN')
    AND group_id = current_app_group_id()
  );

CREATE POLICY giving_manager_insert ON giving_records
  FOR INSERT
  WITH CHECK (
    current_app_user_role() IN ('MANAGER', 'ADMIN')
    AND group_id = current_app_group_id()
  );

-- ─── giving_targets ──────────────────────────────────────────────────────────

CREATE POLICY targets_member_select ON giving_targets
  FOR SELECT
  USING (user_id = current_app_user_id());

CREATE POLICY targets_manager_all ON giving_targets
  FOR ALL
  USING (
    current_app_user_role() IN ('MANAGER', 'ADMIN')
    AND user_id IN (SELECT id FROM users WHERE group_id = current_app_group_id())
  );

-- ─── partnership_projects ────────────────────────────────────────────────────

CREATE POLICY projects_group_read ON partnership_projects
  FOR SELECT
  USING (group_id = current_app_group_id());

CREATE POLICY projects_manager_write ON partnership_projects
  FOR ALL
  USING (
    current_app_user_role() IN ('MANAGER', 'ADMIN')
    AND group_id = current_app_group_id()
  );

-- ─── admin_comments (manager-only, never visible to members) ───────────────────

CREATE POLICY comments_manager_all ON admin_comments
  FOR ALL
  USING (
    current_app_user_role() IN ('MANAGER', 'ADMIN')
    AND group_id = current_app_group_id()
  );

-- ─── member_feedback ─────────────────────────────────────────────────────────

CREATE POLICY feedback_member_select ON member_feedback
  FOR SELECT
  USING (member_id = current_app_user_id());

CREATE POLICY feedback_member_update ON member_feedback
  FOR UPDATE
  USING (member_id = current_app_user_id())
  WITH CHECK (member_id = current_app_user_id());

CREATE POLICY feedback_manager_all ON member_feedback
  FOR ALL
  USING (
    current_app_user_role() IN ('MANAGER', 'ADMIN')
    AND group_id = current_app_group_id()
  );

-- ─── notifications ───────────────────────────────────────────────────────────

CREATE POLICY notifications_own ON notifications
  FOR ALL
  USING (user_id = current_app_user_id())
  WITH CHECK (user_id = current_app_user_id());

-- ─── refresh_tokens ──────────────────────────────────────────────────────────

CREATE POLICY refresh_own ON refresh_tokens
  FOR ALL
  USING (user_id = current_app_user_id());

-- ─── audit_log ───────────────────────────────────────────────────────────────

-- Members cannot read audit log
CREATE POLICY audit_manager_select ON audit_log
  FOR SELECT
  USING (
    current_app_user_role() IN ('MANAGER', 'ADMIN')
    AND group_id = current_app_group_id()
  );

-- All roles can append (insert only via service role)
CREATE POLICY audit_insert ON audit_log
  FOR INSERT
  WITH CHECK (TRUE);

-- ─── Application DB role (least privilege) ─────────────────────────────────
-- Create a non-superuser role for the API connection:

-- CREATE ROLE photizo_app LOGIN PASSWORD 'strong-password';
-- GRANT CONNECT ON DATABASE photizo_haven TO photizo_app;
-- GRANT USAGE ON SCHEMA public TO photizo_app;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO photizo_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO photizo_app;
-- REVOKE DELETE ON audit_log FROM photizo_app;
