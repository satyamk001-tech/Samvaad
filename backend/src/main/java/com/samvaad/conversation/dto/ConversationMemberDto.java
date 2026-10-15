package com.samvaad.conversation.dto;

import com.samvaad.conversation.entity.ConversationMember;
import com.samvaad.conversation.entity.ConversationRole;
import com.samvaad.user.dto.UserDto;

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
