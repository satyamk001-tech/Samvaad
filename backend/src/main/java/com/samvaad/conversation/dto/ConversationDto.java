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
                conversation.getCreatedAt(),
                conversation.getUpdatedAt()
        );
    }
}
