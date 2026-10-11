package com.viora.conversation.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateDirectConversationRequest(
        @NotNull(message = "Recipient user ID is required")
        UUID recipientId
) {}
