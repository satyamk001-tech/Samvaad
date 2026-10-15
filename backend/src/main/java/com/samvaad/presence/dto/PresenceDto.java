package com.samvaad.presence.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Outbound broadcast payload sent to /topic/presence when a user's
 * online/offline status changes.
 */
public record PresenceDto(
        UUID userId,
        String username,
        boolean isOnline,
        Instant lastSeenAt
) {}
