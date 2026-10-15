package com.samvaad.messaging.dto;

import com.samvaad.messaging.entity.MessageStatusType;

import java.time.Instant;
import java.util.UUID;

public record StompAckPayload(
        String tempId,
        UUID messageId,
        UUID conversationId,
        MessageStatusType status,
        Instant timestamp
) {
    public static StompAckPayload sent(String tempId, UUID messageId, UUID conversationId) {
        return new StompAckPayload(tempId, messageId, conversationId, MessageStatusType.SENT, Instant.now());
    }

    public static StompAckPayload delivered(UUID messageId, UUID conversationId) {
        return new StompAckPayload(null, messageId, conversationId, MessageStatusType.DELIVERED, Instant.now());
    }

    public static StompAckPayload read(UUID messageId, UUID conversationId) {
        return new StompAckPayload(null, messageId, conversationId, MessageStatusType.READ, Instant.now());
    }
}
