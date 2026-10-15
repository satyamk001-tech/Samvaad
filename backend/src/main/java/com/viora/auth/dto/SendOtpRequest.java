package com.viora.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record SendOtpRequest(
        @NotBlank(message = "Identifier (email or phone) is required")
        String email
) {}
