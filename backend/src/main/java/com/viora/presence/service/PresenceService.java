package com.viora.presence.service;

import com.viora.messaging.dto.StompEventPayload;
import com.viora.presence.dto.PresenceDto;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Redis-backed presence service.
 *
 * <p>Online state is stored in Redis with a TTL of {@value #PRESENCE_TTL_SECONDS} seconds.
 * The client must send a heartbeat frame to {@code /app/presence.heartbeat} at least once
 * within that window to remain marked as online. On STOMP CONNECT / DISCONNECT lifecycle
 * events (handled by {@link com.viora.presence.event.PresenceEventListener}), this service
 * is called to mark users online or offline and broadcast the change to all subscribers
 * of {@code /topic/presence}.</p>
 */
@Service
public class PresenceService {

    private static final Logger log = LoggerFactory.getLogger(PresenceService.class);

    /** Redis key prefix for presence entries. */
    public static final String PRESENCE_KEY_PREFIX = "presence:";

    /** TTL for a presence key. Client must heartbeat within this window. */
    public static final long PRESENCE_TTL_SECONDS = 70L;

    private final RedisTemplate<String, String> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public PresenceService(
            RedisTemplate<String, String> redisTemplate,
            SimpMessagingTemplate messagingTemplate,
            UserRepository userRepository
    ) {
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    /**
     * Marks a user as online in Redis and broadcasts a {@code PRESENCE_UPDATE} event.
     * Also persists {@code is_online=true} to the PostgreSQL users table.
     *
     * @param userId   the authenticated user's ID
     * @param username the authenticated user's username (for broadcast payload)
     */
    public void markOnline(UUID userId, String username) {
        String key = presenceKey(userId);
        redisTemplate.opsForValue().set(key, "1", Duration.ofSeconds(PRESENCE_TTL_SECONDS));
        persistOnlineStatus(userId, true);
        broadcast(userId, username, true);
        log.debug("User {} marked ONLINE", userId);
    }

    /**
     * Marks a user as offline by deleting the Redis key and broadcasting a
     * {@code PRESENCE_UPDATE} event. Also persists {@code is_online=false} +
     * {@code last_seen_at=now()} to the PostgreSQL users table.
     *
     * @param userId   the authenticated user's ID
     * @param username the authenticated user's username (for broadcast payload)
     */
    public void markOffline(UUID userId, String username) {
        redisTemplate.delete(presenceKey(userId));
        Instant lastSeen = persistOnlineStatus(userId, false);
        broadcastOffline(userId, username, lastSeen);
        log.debug("User {} marked OFFLINE", userId);
    }

    /**
     * Refreshes the Redis TTL for an already-online user (heartbeat).
     *
     * @param userId the authenticated user's ID
     */
    public void refreshHeartbeat(UUID userId) {
        redisTemplate.expire(presenceKey(userId), Duration.ofSeconds(PRESENCE_TTL_SECONDS));
    }

    /**
     * Returns {@code true} if the given user's Redis presence key exists.
     *
     * @param userId the user to check
     */
    public boolean isOnline(UUID userId) {
        Boolean exists = redisTemplate.hasKey(presenceKey(userId));
        return Boolean.TRUE.equals(exists);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private String presenceKey(UUID userId) {
        return PRESENCE_KEY_PREFIX + userId;
    }

    /**
     * Persists the online/offline flag and, when going offline, records
     * {@code last_seen_at}. Returns the {@code lastSeenAt} value recorded.
     */
    private Instant persistOnlineStatus(UUID userId, boolean online) {
        return userRepository.findById(userId).map(user -> {
            user.setOnline(online);
            if (!online) {
                user.setLastSeenAt(Instant.now());
            }
            userRepository.save(user);
            return user.getLastSeenAt();
        }).orElse(null);
    }

    /** Broadcasts an online presence event to the global presence topic. */
    private void broadcast(UUID userId, String username, boolean online) {
        PresenceDto dto = new PresenceDto(userId, username, online, null);
        messagingTemplate.convertAndSend(
                "/topic/presence",
                StompEventPayload.of("PRESENCE_UPDATE", dto)
        );
    }

    /** Broadcasts an offline presence event (includes lastSeenAt timestamp). */
    private void broadcastOffline(UUID userId, String username, Instant lastSeenAt) {
        PresenceDto dto = new PresenceDto(userId, username, false, lastSeenAt);
        messagingTemplate.convertAndSend(
                "/topic/presence",
                StompEventPayload.of("PRESENCE_UPDATE", dto)
        );
    }
}
