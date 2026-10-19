package com.samvaad.auth.service;

import com.samvaad.auth.dto.*;
import com.samvaad.auth.entity.RefreshToken;
import com.samvaad.auth.repository.RefreshTokenRepository;
import com.samvaad.auth.security.JwtTokenProvider;
import com.samvaad.auth.security.UserPrincipal;
import com.samvaad.common.exception.BadRequestException;
import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.user.dto.UserDto;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
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
    private final LoginAttemptService loginAttemptService;
    private final long refreshExpirationMs;

    @org.springframework.beans.factory.annotation.Autowired
    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            LoginAttemptService loginAttemptService,
            @Value("${samvaad.jwt.refresh-expiration-ms:604800000}") long refreshExpirationMs
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.loginAttemptService = loginAttemptService;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            long refreshExpirationMs
    ) {
        this(userRepository, refreshTokenRepository, passwordEncoder, tokenProvider, new LoginAttemptService(), refreshExpirationMs);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String cleanUsername = request.username().trim();
        String cleanEmail = request.email().trim().toLowerCase();
        String cleanDisplayName = (request.displayName() != null && !request.displayName().isBlank())
                ? request.displayName().trim()
                : cleanUsername;

        if (userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new BadRequestException("Email is already registered");
        }

        User user = User.builder()
                .username(cleanUsername)
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .displayName(cleanDisplayName)
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
    public AuthResponse googleLogin(GoogleAuthRequest request) {
        String email = request.email().trim().toLowerCase();
        
        User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            String baseUsername = email.split("@")[0].replaceAll("[^a-zA-Z0-9]", "");
            if (baseUsername.isBlank()) baseUsername = "user";
            String candidateUsername = baseUsername;
            int counter = 1;
            while (userRepository.existsByUsernameIgnoreCase(candidateUsername)) {
                candidateUsername = baseUsername + counter++;
            }

            User newUser = User.builder()
                    .username(candidateUsername)
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .displayName(request.displayName())
                    .avatarUrl(request.avatarUrl())
                    .isOnline(true)
                    .lastSeenAt(Instant.now())
                    .build();
            newUser.setEmailVerified(true);
            return userRepository.save(newUser);
        });

        user.setOnline(true);
        user.setLastSeenAt(Instant.now());
        if (request.avatarUrl() != null && (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())) {
            user.setAvatarUrl(request.avatarUrl());
        }
        User savedUser = userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(savedUser.getId(), savedUser.getUsername());
        String rawRefreshToken = tokenProvider.generateRefreshToken(savedUser.getId());
        refreshTokenRepository.revokeAllUserTokens(savedUser);
        saveRefreshToken(savedUser, rawRefreshToken);

        return new AuthResponse(accessToken, rawRefreshToken, UserDto.fromEntity(savedUser));
    }

    @Transactional
    public AuthResponse phoneLogin(PhoneAuthRequest request) {
        String cleanPhone = request.phoneNumber().trim();
        String formattedUsername = cleanPhone.startsWith("+") ? cleanPhone.substring(1) : cleanPhone;
        String syntheticEmail = cleanPhone + "@samvaad.gov.in";

        User user = userRepository.findByUsernameIgnoreCase(formattedUsername).orElseGet(() -> {
            String defaultDisplay = (request.displayName() != null && !request.displayName().isBlank())
                    ? request.displayName()
                    : "User " + (cleanPhone.length() > 4 ? cleanPhone.substring(cleanPhone.length() - 4) : cleanPhone);

            User newUser = User.builder()
                    .username(formattedUsername)
                    .email(syntheticEmail)
                    .displayName(defaultDisplay)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .isOnline(true)
                    .lastSeenAt(Instant.now())
                    .build();
            newUser.setEmailVerified(true);
            return userRepository.save(newUser);
        });

        user.setOnline(true);
        user.setLastSeenAt(Instant.now());
        User savedUser = userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(savedUser.getId(), savedUser.getUsername());
        String rawRefreshToken = tokenProvider.generateRefreshToken(savedUser.getId());
        refreshTokenRepository.revokeAllUserTokens(savedUser);
        saveRefreshToken(savedUser, rawRefreshToken);

        return new AuthResponse(accessToken, rawRefreshToken, UserDto.fromEntity(savedUser));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String cleanIdentifier = request.usernameOrEmail() != null ? request.usernameOrEmail().trim() : "";
        if (loginAttemptService.isBlocked(cleanIdentifier)) {
            throw new BadRequestException("अत्यधिक विफल प्रयासों के कारण खाता अस्थायी रूप से 15 मिनट के लिए लॉक है • Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.");
        }

        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(cleanIdentifier, cleanIdentifier)
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttemptService.loginFailed(cleanIdentifier);
            throw new UnauthorizedException("उपयोगकर्ता नाम या पासवर्ड अमान्य है • Invalid username or password");
        }

        loginAttemptService.loginSucceeded(cleanIdentifier);

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

    @Transactional(readOnly = true)
    public java.util.List<SessionDto> getActiveSessions(UserPrincipal principal, String currentRefreshToken) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        java.util.List<RefreshToken> tokens = refreshTokenRepository.findByUserAndIsRevokedFalseOrderByCreatedAtDesc(user);

        if (tokens.isEmpty()) {
            return java.util.List.of(new SessionDto(
                    UUID.randomUUID(),
                    Instant.now(),
                    Instant.now().plusSeconds(86400 * 7),
                    true,
                    "Desktop / Mobile",
                    "Samvaad Web Client",
                    "Sovereign OS",
                    "भारत (India) • Sovereign Connection",
                    "127.0.0.1"
            ));
        }

        return tokens.stream().map(t -> {
            boolean isCurr = currentRefreshToken != null && t.getTokenHash().equals(currentRefreshToken);
            if (currentRefreshToken == null && tokens.indexOf(t) == 0) {
                isCurr = true;
            }
            return new SessionDto(
                    t.getId(),
                    t.getCreatedAt() != null ? t.getCreatedAt() : Instant.now(),
                    t.getExpiresAt(),
                    isCurr,
                    "Web Browser / App",
                    "Samvaad Sovereign Client",
                    "Encrypted DTLS-SRTP Session",
                    "भारत (India) • Sovereign Node",
                    "Protected End-to-End"
            );
        }).toList();
    }

    @Transactional
    public void revokeSession(UserPrincipal principal, UUID sessionId) {
        RefreshToken token = refreshTokenRepository.findById(sessionId)
                .orElseThrow(() -> new com.samvaad.common.exception.ResourceNotFoundException("Session not found"));

        if (!token.getUser().getId().equals(principal.getId())) {
            throw new UnauthorizedException("Not authorized to revoke this session");
        }

        token.setRevoked(true);
        refreshTokenRepository.save(token);
    }

    @Transactional
    public void revokeOtherSessions(UserPrincipal principal, UUID currentSessionId) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        java.util.List<RefreshToken> tokens = refreshTokenRepository.findByUserAndIsRevokedFalseOrderByCreatedAtDesc(user);
        for (RefreshToken t : tokens) {
            if (currentSessionId == null || !t.getId().equals(currentSessionId)) {
                t.setRevoked(true);
                refreshTokenRepository.save(t);
            }
        }
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
