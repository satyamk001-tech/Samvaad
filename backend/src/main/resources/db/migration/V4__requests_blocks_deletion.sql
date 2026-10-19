-- ========================================================
-- SAMVAAD DATABASE SCHEMA UPDATE (V4)
-- Privacy, Requests, Moderation & Location:
-- 1. First-contact Message Requests (PENDING, ACCEPTED, REJECTED)
-- 2. User Block List (blocker_id, blocked_id)
-- 3. Per-user Chat Deletion / Hidden state
-- ========================================================

-- 1. Add status and request fields to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACCEPTED';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS requested_to_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. User Blocks Table
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_blocks UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- 3. Per-user Deleted Conversations Table
CREATE TABLE IF NOT EXISTS user_deleted_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_deleted_conv UNIQUE (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_user_deleted_conv_lookup ON user_deleted_conversations(user_id, conversation_id);
