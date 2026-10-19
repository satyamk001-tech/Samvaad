package com.samvaad.auth.dto;

import java.time.Instant;
import java.util.UUID;

public record SessionDto(
        UUID id,
        Instant createdAt,
        Instant expiresAt,
        boolean isCurrent,
        String deviceType,
        String browser,
        String os,
        String location,
        String ipAddress
) {}
