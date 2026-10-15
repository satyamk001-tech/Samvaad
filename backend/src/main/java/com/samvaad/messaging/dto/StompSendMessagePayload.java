package com.samvaad.messaging.dto;

import com.samvaad.messaging.entity.MessageType;
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

        Boolean isViewOnce,

        Boolean isForwarded,

        UUID forwardedFromId,

        @NotBlank(message = "Client temp ID is required for delivery ACK matching")
        String tempId
) {
    public StompSendMessagePayload(UUID conversationId, String content, MessageType type, UUID replyToMessageId, String tempId) {
        this(conversationId, content, type, replyToMessageId, false, false, null, tempId);
    }
}
