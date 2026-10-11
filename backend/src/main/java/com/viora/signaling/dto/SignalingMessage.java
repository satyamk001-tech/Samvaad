package com.viora.signaling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SignalingMessage(
        @NotNull(message = "Call ID is required")
        UUID callId,

        @NotNull(message = "Target user ID is required")
        UUID targetUserId,

        @NotBlank(message = "Signaling type is required")
        String type, // OFFER, ANSWER, ICE_CANDIDATE, RINGING, ACCEPT, REJECT, END

        Object data // SDP string or ICE candidate JSON payload
) {}
