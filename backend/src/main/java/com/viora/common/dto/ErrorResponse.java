package com.viora.common.dto;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        int status,
        String error,
        String message,
        Map<String, String> validationErrors,
        String timestamp
) {
    public ErrorResponse(int status, String error, String message) {
        this(status, error, message, null, Instant.now().toString());
    }

    public ErrorResponse(int status, String error, String message, Map<String, String> validationErrors) {
        this(status, error, message, validationErrors, Instant.now().toString());
    }
}
