package com.viora.messaging.dto;

import com.viora.messaging.entity.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record StompSendMessagePayload(
        @NotNull(message = "Conversation ID is required")
        UUID conversationId,

        @NotBlank(message = "Message content cannot be blank")
        @Size(max = 5000, message = "Message content cannot exceed 5000 characters")
        String content,

        MessageType type,

        UUID replyToMessageId,

        @NotBlank(message = "Client temp ID is required for delivery ACK matching")
        String tempId
) {}
