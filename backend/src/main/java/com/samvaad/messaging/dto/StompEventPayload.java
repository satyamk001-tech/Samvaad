package com.samvaad.messaging.dto;

import java.time.Instant;

public record StompEventPayload<T>(
        String eventType,
        T data,
        Instant timestamp
) {
    public static <T> StompEventPayload<T> of(String eventType, T data) {
        return new StompEventPayload<>(eventType, data, Instant.now());
    }
}
