package com.samvaad.user.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SearchRateLimiterTest {

    private SearchRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new SearchRateLimiter();
    }

    @Test
    void shouldAllowQueriesWithinLimit() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 30; i++) {
            assertTrue(rateLimiter.tryAcquire(userId), "Request " + (i + 1) + " should be allowed");
        }
    }

    @Test
    void shouldBlockQueriesExceedingLimit() {
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < 30; i++) {
            rateLimiter.tryAcquire(userId);
        }
        assertFalse(rateLimiter.tryAcquire(userId), "Request 31 should be rejected by rate limiter");
    }

    @Test
    void shouldTrackDifferentUsersIndependently() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();

        for (int i = 0; i < 30; i++) {
            rateLimiter.tryAcquire(userA);
        }

        assertFalse(rateLimiter.tryAcquire(userA));
        assertTrue(rateLimiter.tryAcquire(userB));
    }
}
