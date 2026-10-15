package com.samvaad.auth.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private final String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private final long expirationMs = 3600000; // 1 hour
    private final long refreshExpirationMs = 86400000; // 1 day

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(secret, expirationMs, refreshExpirationMs);
    }

    @Test
    void shouldGenerateAndValidateAccessToken() {
        UUID userId = UUID.randomUUID();
        String username = "elena_rostova";

        String token = tokenProvider.generateAccessToken(userId, username);

        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals(userId, tokenProvider.getUserIdFromToken(token));
        assertEquals(username, tokenProvider.getUsernameFromToken(token));
    }

    @Test
    void shouldGenerateAndValidateRefreshToken() {
        UUID userId = UUID.randomUUID();

        String refreshToken = tokenProvider.generateRefreshToken(userId);

        assertNotNull(refreshToken);
        assertTrue(tokenProvider.validateToken(refreshToken));
        assertEquals(userId, tokenProvider.getUserIdFromToken(refreshToken));
    }

    @Test
    void shouldReturnFalseForInvalidToken() {
        String invalidToken = "invalid.jwt.token";
        assertFalse(tokenProvider.validateToken(invalidToken));
    }
}
