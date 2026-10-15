package com.samvaad.messaging.dto;

import java.util.UUID;

/**
 * Outbound broadcast payload for a typing indicator event.
 *
 * <p>Broadcast by the server to {@code /topic/conversations.{conversationId}}
 * as the body of a {@code StompEventPayload} with eventType {@code "TYPING"}.</p>
 *
 * @param userId   the user who is (or has stopped) typing
 * @param username display-friendly username
 * @param isTyping {@code true} = currently typing, {@code false} = stopped
 */
public record StompTypingEventPayload(
        UUID userId,
        String username,
        boolean isTyping
) {}
