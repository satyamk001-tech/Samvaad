package com.viora.messaging.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EditMessageRequest(
        @NotBlank(message = "Updated content cannot be blank")
        @Size(max = 5000, message = "Message content cannot exceed 5000 characters")
        String content
) {}
