package com.samvaad.signaling.dto;

import com.samvaad.signaling.entity.CallType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record InitiateCallRequest(
        @NotNull(message = "Receiver ID is required")
        UUID receiverId,

        UUID conversationId,

        @NotNull(message = "Call type is required")
        CallType type
) {}
