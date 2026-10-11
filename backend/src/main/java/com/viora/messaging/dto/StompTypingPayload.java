package com.viora.messaging.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Inbound STOMP frame payload for typing indicator signals.
 *
 * <p>Sent by a client to {@code /app/chat.typing} to inform conversation
 * participants that they are currently typing (or have stopped).</p>
 *
 * @param conversationId the conversation the typing event belongs to
 * @param isTyping       {@code true} when the user starts typing, {@code false} when they stop
 */
public record StompTypingPayload(
        @NotNull(message = "Conversation ID is required")
        UUID conversationId,

        boolean isTyping
) {}
