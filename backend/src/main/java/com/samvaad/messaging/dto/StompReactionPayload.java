package com.samvaad.messaging.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record StompReactionPayload(
        @NotNull(message = "Message ID is required")
        UUID messageId,

        @NotNull(message = "Conversation ID is required")
        UUID conversationId,

        @NotBlank(message = "Emoji is required")
        String emoji
) {}
