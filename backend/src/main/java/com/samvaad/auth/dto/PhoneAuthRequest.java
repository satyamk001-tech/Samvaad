package com.samvaad.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PhoneAuthRequest(
        @NotBlank(message = "Phone number is required")
        @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Must be a valid international phone number")
        String phoneNumber,

        String displayName,

        String idToken
) {}
