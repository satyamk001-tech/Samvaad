-- ========================================================
-- SAMVAAD DATABASE SCHEMA UPDATE (V3)
-- Advanced Feature Suites:
-- 1. Pinned Chats & Starred Messages
-- 2. Disappearing Messages, View Once & Forwarding
-- 3. Call Links & Rooms
-- 4. DigiLocker / Sovereign Vault Documents
-- ========================================================

-- 1. PINNED CONVERSATIONS (Per User)
CREATE TABLE IF NOT EXISTS user_pinned_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    pin_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_pinned_conv UNIQUE (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_user_pinned_conv_lookup ON user_pinned_conversations(user_id, pin_order);

-- 2. STARRED MESSAGES (Per User)
CREATE TABLE IF NOT EXISTS user_starred_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_starred_msg UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_user_starred_msg_lookup ON user_starred_messages(user_id, conversation_id);

-- 3. CONVERSATION SETTINGS (Disappearing Messages duration & custom tags)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS disappearing_seconds INTEGER DEFAULT NULL;
ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS folder_tag VARCHAR(20) DEFAULT 'ALL';

-- 4. MESSAGE ENHANCEMENTS (View Once, Forwarded flag, Original Sender)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_view_once BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 5. CALL LINKS & INSTANT MEET ROOMS
CREATE TABLE IF NOT EXISTS call_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(50) NOT NULL UNIQUE,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_type VARCHAR(20) NOT NULL DEFAULT 'VIDEO',
    title VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_call_rooms_code ON call_rooms(room_code, is_active);

CREATE TABLE IF NOT EXISTS call_room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES call_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_room_participant UNIQUE (room_id, user_id)
);

-- 6. DIGILOCKER / SOVEREIGN VAULT DOCUMENTS
CREATE TABLE IF NOT EXISTS sovereign_vault_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL, -- 'AADHAAR', 'PAN', 'DRIVING_LICENSE', 'DEGREE', 'CUSTOM'
    doc_number VARCHAR(100),
    doc_name VARCHAR(200) NOT NULL,
    file_url VARCHAR(500),
    issuer VARCHAR(150) DEFAULT 'DigiLocker Verified',
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sovereign_vault_user ON sovereign_vault_docs(user_id);
