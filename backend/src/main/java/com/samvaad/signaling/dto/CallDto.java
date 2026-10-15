package com.samvaad.signaling.dto;

import com.samvaad.signaling.entity.Call;
import com.samvaad.signaling.entity.CallStatus;
import com.samvaad.signaling.entity.CallType;
import com.samvaad.user.dto.UserDto;

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
