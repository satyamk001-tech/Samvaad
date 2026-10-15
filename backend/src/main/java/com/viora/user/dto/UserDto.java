package com.viora.user.dto;

import com.viora.user.entity.User;

import java.time.Instant;
import java.util.UUID;

public record UserDto(
        UUID id,
        String username,
        String email,
        String displayName,
        String bio,
        String avatarUrl,
        String statusMessage,
        boolean isOnline,
        Instant lastSeenAt,
        String languagePreference,
        boolean emailVerified,
        Instant createdAt
) {
    public static UserDto fromEntity(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getStatusMessage(),
                user.isOnline(),
                user.getLastSeenAt(),
                user.getLanguagePreference() != null ? user.getLanguagePreference() : "hi",
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}
