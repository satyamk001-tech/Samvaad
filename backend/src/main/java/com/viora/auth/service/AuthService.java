package com.viora.auth.service;

import com.viora.auth.dto.*;
import com.viora.auth.entity.RefreshToken;
import com.viora.auth.repository.RefreshTokenRepository;
import com.viora.auth.security.JwtTokenProvider;
import com.viora.auth.security.UserPrincipal;
import com.viora.common.exception.BadRequestException;
import com.viora.common.exception.UnauthorizedException;
import com.viora.user.dto.UserDto;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final long refreshExpirationMs;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            @Value("${viora.jwt.refresh-expiration-ms:604800000}") long refreshExpirationMs
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email is already registered");
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .displayName(request.displayName())
                .isOnline(true)
                .lastSeenAt(Instant.now())
                .build();

        User savedUser = userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(savedUser.getId(), savedUser.getUsername());
        String rawRefreshToken = tokenProvider.generateRefreshToken(savedUser.getId());
        saveRefreshToken(savedUser, rawRefreshToken);

        return new AuthResponse(accessToken, rawRefreshToken, UserDto.fromEntity(savedUser));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameOrEmail(request.usernameOrEmail(), request.usernameOrEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid username or password");
        }

        user.setOnline(true);
        user.setLastSeenAt(Instant.now());
        userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getUsername());
        String rawRefreshToken = tokenProvider.generateRefreshToken(user.getId());
        
        // Revoke prior tokens and save new refresh token
        refreshTokenRepository.revokeAllUserTokens(user);
        saveRefreshToken(user, rawRefreshToken);

        return new AuthResponse(accessToken, rawRefreshToken, UserDto.fromEntity(user));
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String rawRefreshToken = request.refreshToken();

        if (!tokenProvider.validateToken(rawRefreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        RefreshToken tokenEntity = refreshTokenRepository.findByTokenHash(rawRefreshToken)
                .orElseThrow(() -> new UnauthorizedException("Refresh token not found"));

        if (tokenEntity.isRevoked() || tokenEntity.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Refresh token is revoked or expired");
        }

        User user = tokenEntity.getUser();
        tokenEntity.setRevoked(true);
        refreshTokenRepository.save(tokenEntity);

        String newAccessToken = tokenProvider.generateAccessToken(user.getId(), user.getUsername());
        String newRefreshToken = tokenProvider.generateRefreshToken(user.getId());
        saveRefreshToken(user, newRefreshToken);

        return new AuthResponse(newAccessToken, newRefreshToken, UserDto.fromEntity(user));
    }

    @Transactional
    public void logout(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        user.setOnline(false);
        user.setLastSeenAt(Instant.now());
        userRepository.save(user);
        refreshTokenRepository.revokeAllUserTokens(user);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        return UserDto.fromEntity(user);
    }

    private void saveRefreshToken(User user, String rawToken) {
        RefreshToken token = RefreshToken.builder()
                .user(user)
                .tokenHash(rawToken)
                .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                .isRevoked(false)
                .build();
        refreshTokenRepository.save(token);
    }
}
