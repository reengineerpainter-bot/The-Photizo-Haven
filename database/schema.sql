-- The Photizo Haven — Canonical PostgreSQL Schema
-- Requires: PostgreSQL 15+, extension pgcrypto

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('MEMBER', 'MANAGER', 'ADMIN');
CREATE TYPE giving_category AS ENUM (
  'TITHE',
  'PCO_SEED',
  'HAVEN_DUES',
  'WELFARE',
  'LOCAL_PARTNERSHIP'
);
CREATE TYPE consistency_status AS ENUM ('OUTSTANDING', 'CONSISTENT', 'LAGGING', 'LAPSED');
CREATE TYPE audit_action AS ENUM (
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'MFA_ENABLED',
  'MFA_VERIFIED',
  'PROFILE_UPDATE',
  'GIVING_RECORDED',
  'ADMIN_COMMENT',
  'ADMIN_FEEDBACK',
  'REPORT_GENERATED',
  'MEMBER_CREATED',
  'ROLE_CHANGED'
);

-- ─── Groups ──────────────────────────────────────────────────────────────────

CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users ───────────────────────────────────────────────────────────────────
-- PII fields stored encrypted at application layer (AES-256) before insert.
-- phone_encrypted / email_encrypted hold ciphertext; *_hash for lookup.

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  role              user_role NOT NULL DEFAULT 'MEMBER',
  full_name         VARCHAR(200) NOT NULL,
  phone_encrypted   TEXT NOT NULL,
  phone_hash        VARCHAR(64) NOT NULL,
  email_encrypted   TEXT NOT NULL,
  email_hash        VARCHAR(64) NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  date_joined       DATE NOT NULL,
  mfa_secret        TEXT,
  mfa_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  last_giving_at    TIMESTAMPTZ,
  consistency       consistency_status NOT NULL DEFAULT 'CONSISTENT',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_group_id ON users(group_id);
CREATE INDEX idx_users_email_hash ON users(email_hash);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_last_giving ON users(last_giving_at);

-- ─── Giving Records ──────────────────────────────────────────────────────────

CREATE TABLE giving_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  category        giving_category NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency        CHAR(3) NOT NULL DEFAULT 'GHS',
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_month    DATE NOT NULL,
  notes           TEXT,
  project_desc    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_giving_per_period UNIQUE (user_id, category, period_month)
);

CREATE INDEX idx_giving_user ON giving_records(user_id);
CREATE INDEX idx_giving_group ON giving_records(group_id);
CREATE INDEX idx_giving_category ON giving_records(category);
CREATE INDEX idx_giving_period ON giving_records(period_month);

-- ─── Giving Targets (monthly goals per category) ─────────────────────────────

CREATE TABLE giving_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        giving_category NOT NULL,
  target_amount   NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  is_percentage   BOOLEAN NOT NULL DEFAULT FALSE,
  percentage      NUMERIC(5, 2),
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_target_user_category UNIQUE (user_id, category)
);

-- ─── Local Partnership Projects (monthly active project) ─────────────────────

CREATE TABLE partnership_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  active_month    DATE NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_group_month UNIQUE (group_id, active_month)
);

-- ─── Admin Comments (internal, manager-only) ─────────────────────────────────

CREATE TABLE admin_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_member ON admin_comments(member_id);

-- ─── Member Feedback (visible to member) ─────────────────────────────────────

CREATE TABLE member_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  subject         VARCHAR(200) NOT NULL,
  body            TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_member ON member_feedback(member_id);

-- ─── Notifications ───────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  body            TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ─── Refresh Tokens (server-side revocation) ─────────────────────────────────

CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      VARCHAR(64) NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

-- ─── Audit Log (immutable, append-only) ──────────────────────────────────────

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  group_id        UUID REFERENCES groups(id) ON DELETE SET NULL,
  action          audit_action NOT NULL,
  resource_type   VARCHAR(50),
  resource_id     UUID,
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_group ON audit_log(group_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Prevent UPDATE/DELETE on audit_log at DB level
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- ─── Session context helper (set by API before queries) ──────────────────────

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_app_user_role()
RETURNS user_role AS $$
  SELECT NULLIF(current_setting('app.current_user_role', TRUE), '')::user_role;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_app_group_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_group_id', TRUE), '')::UUID;
$$ LANGUAGE sql STABLE;
