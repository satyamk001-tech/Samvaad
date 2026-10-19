package com.samvaad.conversation.dto;

import com.samvaad.conversation.entity.Conversation;
import com.samvaad.conversation.entity.ConversationType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ConversationDto(
        UUID id,
        ConversationType type,
        String title,
        String avatarUrl,
        List<ConversationMemberDto> members,
        String status,
        UUID requestedToId,
        Instant createdAt,
        Instant updatedAt
) {
    public static ConversationDto fromEntity(Conversation conversation, List<ConversationMemberDto> members) {
        return new ConversationDto(
                conversation.getId(),
                conversation.getType(),
                conversation.getTitle(),
                conversation.getAvatarUrl(),
                members,
                conversation.getStatus() != null ? conversation.getStatus() : "ACCEPTED",
                conversation.getRequestedTo() != null ? conversation.getRequestedTo().getId() : null,
                conversation.getCreatedAt(),
                conversation.getUpdatedAt()
        );
    }
}
