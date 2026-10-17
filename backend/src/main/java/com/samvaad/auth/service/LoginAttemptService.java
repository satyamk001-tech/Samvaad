package com.samvaad.auth.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory brute-force protection service.
 * Tracks failed authentication attempts and temporarily locks identifiers
 * that exceed the threshold to prevent credential stuffing and password guessing.
 */
@Service
public class LoginAttemptService {

    public static final int MAX_ATTEMPTS = 5;
    public static final long LOCKOUT_DURATION_SECONDS = 900; // 15 minutes

    private record AttemptRecord(int count, Instant firstAttemptAt, Instant lockedUntil) {}

    private final ConcurrentHashMap<String, AttemptRecord> attemptsMap = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        if (key == null || key.isBlank()) return false;
        String cleanKey = key.trim().toLowerCase();

        AttemptRecord record = attemptsMap.get(cleanKey);
        if (record == null) return false;

        Instant now = Instant.now();
        if (record.lockedUntil() != null) {
            if (now.isBefore(record.lockedUntil())) {
                return true;
            } else {
                // Lockout period has elapsed; reset
                attemptsMap.remove(cleanKey);
                return false;
            }
        }
        return false;
    }

    public void loginFailed(String key) {
        if (key == null || key.isBlank()) return;
        String cleanKey = key.trim().toLowerCase();
        Instant now = Instant.now();

        attemptsMap.compute(cleanKey, (_k, existing) -> {
            if (existing == null) {
                return new AttemptRecord(1, now, null);
            }

            // If existing window is older than lockout duration, restart window
            if (now.isAfter(existing.firstAttemptAt().plusSeconds(LOCKOUT_DURATION_SECONDS))) {
                return new AttemptRecord(1, now, null);
            }

            int newCount = existing.count() + 1;
            Instant lockedUntil = newCount >= MAX_ATTEMPTS ? now.plusSeconds(LOCKOUT_DURATION_SECONDS) : null;
            return new AttemptRecord(newCount, existing.firstAttemptAt(), lockedUntil);
        });
    }

    public void loginSucceeded(String key) {
        if (key == null || key.isBlank()) return;
        attemptsMap.remove(key.trim().toLowerCase());
    }

    public void resetAll() {
        attemptsMap.clear();
    }
}
