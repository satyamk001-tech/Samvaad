package com.viora.auth.dto;

import com.viora.user.dto.UserDto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        UserDto user
) {
    public AuthResponse(String accessToken, String refreshToken, UserDto user) {
        this(accessToken, refreshToken, "Bearer", user);
    }
}
