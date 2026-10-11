package com.viora.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 1, max = 100, message = "Display name must be between 1 and 100 characters")
        String displayName,

        @Size(max = 255, message = "Bio cannot exceed 255 characters")
        String bio,

        @Size(max = 500, message = "Avatar URL cannot exceed 500 characters")
        String avatarUrl,

        @Size(max = 255, message = "Status message cannot exceed 255 characters")
        String statusMessage
) {}
