package com.viora.messaging.dto;

import com.viora.messaging.entity.Message;
import com.viora.messaging.entity.MessageType;
import com.viora.user.dto.UserDto;

import java.time.Instant;
import java.util.UUID;

public record MessageDto(
        UUID id,
        UUID conversationId,
        UserDto sender,
        UUID replyToMessageId,
        String content,
        MessageType type,
        boolean isEdited,
        boolean isDeleted,
        Instant createdAt,
        Instant updatedAt
) {
    public static MessageDto fromEntity(Message message) {
        return new MessageDto(
                message.getId(),
                message.getConversation().getId(),
                UserDto.fromEntity(message.getSender()),
                message.getReplyToMessage() != null ? message.getReplyToMessage().getId() : null,
                message.isDeleted() ? "This message was deleted" : message.getContent(),
                message.getType(),
                message.isEdited(),
                message.isDeleted(),
                message.getCreatedAt(),
                message.getUpdatedAt()
        );
    }
}
