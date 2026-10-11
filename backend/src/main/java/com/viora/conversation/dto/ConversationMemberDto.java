package com.viora.conversation.dto;

import com.viora.conversation.entity.ConversationMember;
import com.viora.conversation.entity.ConversationRole;
import com.viora.user.dto.UserDto;

import java.time.Instant;
import java.util.UUID;

public record ConversationMemberDto(
        UUID id,
        UserDto user,
        ConversationRole role,
        Instant joinedAt
) {
    public static ConversationMemberDto fromEntity(ConversationMember member) {
        return new ConversationMemberDto(
                member.getId(),
                UserDto.fromEntity(member.getUser()),
                member.getRole(),
                member.getJoinedAt()
        );
    }
}
