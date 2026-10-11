package com.viora.signaling.dto;

import com.viora.signaling.entity.Call;
import com.viora.signaling.entity.CallStatus;
import com.viora.signaling.entity.CallType;
import com.viora.user.dto.UserDto;

import java.time.Instant;
import java.util.UUID;

public record CallDto(
        UUID id,
        UserDto caller,
        UserDto receiver,
        UUID conversationId,
        CallType type,
        CallStatus status,
        Instant startedAt,
        Instant endedAt,
        Integer durationSeconds
) {
    public static CallDto fromEntity(Call call) {
        return new CallDto(
                call.getId(),
                UserDto.fromEntity(call.getCaller()),
                UserDto.fromEntity(call.getReceiver()),
                call.getConversation() != null ? call.getConversation().getId() : null,
                call.getType(),
                call.getStatus(),
                call.getStartedAt(),
                call.getEndedAt(),
                call.getDurationSeconds()
        );
    }
}
