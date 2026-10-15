package com.samvaad.auth.service;

import com.samvaad.auth.dto.AuthResponse;
import com.samvaad.auth.dto.LoginRequest;
import com.samvaad.auth.dto.RegisterRequest;
import com.samvaad.auth.entity.RefreshToken;
import com.samvaad.auth.repository.RefreshTokenRepository;
import com.samvaad.auth.security.JwtTokenProvider;
import com.samvaad.common.exception.BadRequestException;
import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
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
        RegisterRequest request = new RegisterRequest("elena", "elena@samvaad.gov.in", "secret123", "Elena Rostova");

        when(userRepository.existsByUsernameIgnoreCase("elena")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("elena@samvaad.gov.in")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed_secret123");

        UUID userId = UUID.randomUUID();
        User savedUser = User.builder()
                .id(userId)
                .username("elena")
                .email("elena@samvaad.gov.in")
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
        RegisterRequest request = new RegisterRequest("elena", "elena@samvaad.gov.in", "secret123", "Elena Rostova");
        when(userRepository.existsByUsernameIgnoreCase("elena")).thenReturn(true);

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
                .email("elena@samvaad.gov.in")
                .passwordHash("hashed_secret123")
                .displayName("Elena Rostova")
                .build();

        when(userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase("elena", "elena")).thenReturn(Optional.of(user));
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

        when(userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase("elena", "elena")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", "hashed_secret123")).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> authService.login(request));
    }
}
