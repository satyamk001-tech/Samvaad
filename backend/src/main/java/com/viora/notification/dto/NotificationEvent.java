package com.viora.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationEvent(
        UUID recipientId,
        String title,
        String message,
        String type, // MESSAGE, CALL, GROUP
        Instant timestamp
) {}
