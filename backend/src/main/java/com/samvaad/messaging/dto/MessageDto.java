package com.samvaad.messaging.dto;

import com.samvaad.messaging.entity.Message;
import com.samvaad.messaging.entity.MessageStatusType;
import com.samvaad.messaging.entity.MessageType;
import com.samvaad.user.dto.UserDto;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record MessageDto(
        UUID id,
        UUID conversationId,
        UserDto sender,
        UUID replyToMessageId,
        String replyToSnippet,
        String content,
        MessageType type,
        boolean isEdited,
        boolean isDeleted,
        boolean isViewOnce,
        Instant viewedAt,
        boolean isForwarded,
        UserDto forwardedFrom,
        MessageStatusType status,
        List<ReactionSummaryDto> reactions,
        Instant createdAt,
        Instant updatedAt
) {
    public static MessageDto fromEntity(Message message) {
        return fromEntity(message, MessageStatusType.SENT, Collections.emptyList());
    }

    public static MessageDto fromEntity(Message message, MessageStatusType status, List<ReactionSummaryDto> reactions) {
        String replySnippet = null;
        if (message.getReplyToMessage() != null) {
            String snippet = message.getReplyToMessage().getContent();
            if (snippet != null && snippet.length() > 60) {
                snippet = snippet.substring(0, 57) + "...";
            }
            replySnippet = snippet;
        }

        return new MessageDto(
                message.getId(),
                message.getConversation().getId(),
                UserDto.fromEntity(message.getSender()),
                message.getReplyToMessage() != null ? message.getReplyToMessage().getId() : null,
                replySnippet,
                message.isDeleted() ? "This message was deleted" : message.getContent(),
                message.getType(),
                message.isEdited(),
                message.isDeleted(),
                message.isViewOnce(),
                message.getViewedAt(),
                message.isForwarded(),
                message.getForwardedFrom() != null ? UserDto.fromEntity(message.getForwardedFrom()) : null,
                status != null ? status : MessageStatusType.SENT,
                reactions != null ? reactions : Collections.emptyList(),
                message.getCreatedAt(),
                message.getUpdatedAt()
        );
    }
}
