-- ========================================================
-- SAMVAAD DATABASE SCHEMA UPDATE (V5)
-- Index for exact case-insensitive username discovery lookup
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_users_lower_username ON users (LOWER(username));
