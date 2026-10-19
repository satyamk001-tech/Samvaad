-- ========================================================
-- SAMVAAD DATABASE SCHEMA UPDATE (V6)
-- Add LOCATION (and AUDIO, VIDEO) to messages_type_check constraint
-- ========================================================

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (
    type IN ('TEXT', 'IMAGE', 'DOCUMENT', 'VOICE_NOTE', 'LOCATION', 'SYSTEM', 'CALL_LOG', 'AUDIO', 'VIDEO')
);
