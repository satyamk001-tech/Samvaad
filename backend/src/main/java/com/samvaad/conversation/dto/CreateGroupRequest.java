package com.samvaad.conversation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateGroupRequest(
        @NotBlank(message = "Group title is required")
        @Size(min = 1, max = 100, message = "Group title must be between 1 and 100 characters")
        String title,

        @Size(max = 500, message = "Avatar URL cannot exceed 500 characters")
        String avatarUrl,

        @NotEmpty(message = "Member user IDs list cannot be empty")
        List<UUID> memberIds
) {}
