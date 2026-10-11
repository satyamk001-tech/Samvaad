package com.viora.group.dto;

import jakarta.validation.constraints.Size;

public record UpdateGroupMetadataRequest(
        @Size(min = 1, max = 100, message = "Title must be between 1 and 100 characters")
        String title,

        @Size(max = 500, message = "Avatar URL must not exceed 500 characters")
        String avatarUrl
) {}
