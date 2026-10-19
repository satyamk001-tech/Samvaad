package com.samvaad.user.security;

import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Protects user discovery against username enumeration and scraping attacks
 * by enforcing a per-user rate limit on search queries.
 */
@Component
public class SearchRateLimiter {

    private static final int MAX_SEARCHES_PER_MINUTE = 30;
    private static final long WINDOW_MS = 60_000L;

    private final ConcurrentHashMap<UUID, AtomicInteger> counts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, Long> windowStartTimes = new ConcurrentHashMap<>();

    public boolean tryAcquire(UUID userId) {
        if (userId == null) {
            return true;
        }

        long now = System.currentTimeMillis();
        windowStartTimes.compute(userId, (id, start) -> {
            if (start == null || (now - start) > WINDOW_MS) {
                counts.put(id, new AtomicInteger(0));
                return now;
            }
            return start;
        });

        AtomicInteger counter = counts.computeIfAbsent(userId, k -> new AtomicInteger(0));
        return counter.incrementAndGet() <= MAX_SEARCHES_PER_MINUTE;
    }

    public void reset(UUID userId) {
        if (userId != null) {
            counts.remove(userId);
            windowStartTimes.remove(userId);
        }
    }
}
