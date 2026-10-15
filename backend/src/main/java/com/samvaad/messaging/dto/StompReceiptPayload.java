package com.samvaad.messaging.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Inbound STOMP frame payload for message delivery and read receipt signals.
 *
 * <p>Used by both {@code /app/chat.delivered} and {@code /app/chat.read} endpoints.</p>
 *
 * @param messageId      the ID of the message being acknowledged
 * @param conversationId the conversation the message belongs to (used for membership guard)
 */
public record StompReceiptPayload(
        @NotNull(message = "Message ID is required")
        UUID messageId,

        @NotNull(message = "Conversation ID is required")
        UUID conversationId
) {}
