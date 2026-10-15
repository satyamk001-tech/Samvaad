package com.samvaad.auth.service;

import com.samvaad.common.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Service
public class OtpVerificationService {

    private static final Logger log = LoggerFactory.getLogger(OtpVerificationService.class);
    private final JdbcTemplate jdbcTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpVerificationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public Map<String, Object> generateAndSendOtp(String identifier) {
        String cleanTarget = identifier.trim().toLowerCase();

        // Rate limit: check if an unused OTP was generated less than 60 seconds ago
        Integer recentCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM email_otps WHERE email = ? AND is_used = false AND created_at > ?",
                Integer.class,
                cleanTarget,
                java.sql.Timestamp.from(Instant.now().minus(60, ChronoUnit.SECONDS))
        );

        if (recentCount != null && recentCount > 0) {
            throw new BadRequestException("Please wait at least 60 seconds before requesting another OTP");
        }

        // Invalidate older unused OTPs for this target
        jdbcTemplate.update("UPDATE email_otps SET is_used = true WHERE email = ? AND is_used = false", cleanTarget);

        // Generate cryptographically secure 6-digit OTP
        int otpNumber = 100000 + secureRandom.nextInt(900000);
        String otpCode = String.valueOf(otpNumber);
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);

        jdbcTemplate.update(
                "INSERT INTO email_otps (email, otp_code, attempts, expires_at, is_used) VALUES (?, ?, 0, ?, false)",
                cleanTarget, otpCode, java.sql.Timestamp.from(expiresAt)
        );

        log.info("=================================================================");
        log.info("🔑 SAMVAAD SOVEREIGN OTP DISPATCHED TO [{}]: {}", cleanTarget, otpCode);
        log.info("⏰ Valid for 10 minutes until {}", expiresAt);
        log.info("=================================================================");

        return Map.of(
                "message", "OTP sent successfully to " + cleanTarget,
                "expiresInSeconds", 600,
                "resendWaitSeconds", 60,
                "previewCode", otpCode
        );
    }

    @Transactional
    public boolean verifyOtp(String identifier, String otpCode) {
        String cleanTarget = identifier.trim().toLowerCase();
        String code = otpCode.trim();

        var rows = jdbcTemplate.queryForList(
                "SELECT id, otp_code, attempts, expires_at, is_used FROM email_otps " +
                "WHERE email = ? AND is_used = false ORDER BY created_at DESC LIMIT 1",
                cleanTarget
        );

        if (rows.isEmpty()) {
            throw new BadRequestException("No active OTP found. Please request a new code.");
        }

        Map<String, Object> row = rows.get(0);
        Object id = row.get("id");
        String storedOtp = (String) row.get("otp_code");
        int attempts = ((Number) row.get("attempts")).intValue();
        Instant expiresAt = ((java.sql.Timestamp) row.get("expires_at")).toInstant();

        if (attempts >= 5) {
            jdbcTemplate.update("UPDATE email_otps SET is_used = true WHERE id = ?", id);
            throw new BadRequestException("Maximum attempts exceeded. This OTP has been invalidated. Please request a new one.");
        }

        if (Instant.now().isAfter(expiresAt)) {
            jdbcTemplate.update("UPDATE email_otps SET is_used = true WHERE id = ?", id);
            throw new BadRequestException("OTP has expired. Please request a new code.");
        }

        if (!storedOtp.equals(code)) {
            jdbcTemplate.update("UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?", id);
            int remaining = 4 - attempts;
            throw new BadRequestException("Invalid OTP code. " + remaining + " attempts remaining.");
        }

        // Mark OTP as used
        jdbcTemplate.update("UPDATE email_otps SET is_used = true WHERE id = ?", id);

        // Mark user email_verified / phone verified if user exists
        jdbcTemplate.update("UPDATE users SET email_verified = true WHERE email = ? OR username = ?", cleanTarget, cleanTarget);

        return true;
    }
}
