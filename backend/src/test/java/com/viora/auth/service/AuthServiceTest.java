package com.viora.auth.service;

import com.viora.auth.dto.AuthResponse;
import com.viora.auth.dto.LoginRequest;
import com.viora.auth.dto.RegisterRequest;
import com.viora.auth.entity.RefreshToken;
import com.viora.auth.repository.RefreshTokenRepository;
import com.viora.auth.security.JwtTokenProvider;
import com.viora.common.exception.BadRequestException;
import com.viora.common.exception.UnauthorizedException;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, refreshTokenRepository, passwordEncoder, tokenProvider, 604800000);
    }

    @Test
    void shouldSuccessfullyRegisterNewUser() {
        RegisterRequest request = new RegisterRequest("elena", "elena@violet.chat", "secret123", "Elena Rostova");

        when(userRepository.existsByUsername("elena")).thenReturn(false);
        when(userRepository.existsByEmail("elena@violet.chat")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed_secret123");

        UUID userId = UUID.randomUUID();
        User savedUser = User.builder()
                .id(userId)
                .username("elena")
                .email("elena@violet.chat")
                .passwordHash("hashed_secret123")
                .displayName("Elena Rostova")
                .isOnline(true)
                .build();

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(tokenProvider.generateAccessToken(userId, "elena")).thenReturn("jwt_access_token");
        when(tokenProvider.generateRefreshToken(userId)).thenReturn("jwt_refresh_token");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("jwt_access_token", response.accessToken());
        assertEquals("jwt_refresh_token", response.refreshToken());
        assertEquals("elena", response.user().username());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("hashed_secret123", userCaptor.getValue().getPasswordHash());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void shouldThrowBadRequestExceptionWhenUsernameAlreadyTaken() {
        RegisterRequest request = new RegisterRequest("elena", "elena@violet.chat", "secret123", "Elena Rostova");
        when(userRepository.existsByUsername("elena")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldSuccessfullyLoginUser() {
        LoginRequest request = new LoginRequest("elena", "secret123");
        UUID userId = UUID.randomUUID();

        User user = User.builder()
                .id(userId)
                .username("elena")
                .email("elena@violet.chat")
                .passwordHash("hashed_secret123")
                .displayName("Elena Rostova")
                .build();

        when(userRepository.findByUsernameOrEmail("elena", "elena")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret123", "hashed_secret123")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(tokenProvider.generateAccessToken(userId, "elena")).thenReturn("jwt_access_token");
        when(tokenProvider.generateRefreshToken(userId)).thenReturn("jwt_refresh_token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt_access_token", response.accessToken());
        verify(refreshTokenRepository).revokeAllUserTokens(user);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void shouldThrowUnauthorizedExceptionOnInvalidPassword() {
        LoginRequest request = new LoginRequest("elena", "wrongpassword");
        User user = User.builder()
                .id(UUID.randomUUID())
                .username("elena")
                .passwordHash("hashed_secret123")
                .build();

        when(userRepository.findByUsernameOrEmail("elena", "elena")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", "hashed_secret123")).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));
    }
}
