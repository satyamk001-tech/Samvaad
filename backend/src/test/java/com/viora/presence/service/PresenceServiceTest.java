package com.viora.presence.service;

import com.viora.messaging.dto.StompEventPayload;
import com.viora.presence.dto.PresenceDto;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PresenceService Tests")
class PresenceServiceTest {

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PresenceService presenceService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        user.setUsername("alice");
        user.setEmail("alice@viora.io");
        user.setOnline(false);
    }

    @Test
    @DisplayName("markOnline sets Redis key with TTL, persists is_online=true, and broadcasts")
    void markOnline_setsRedisAndPersistsAndBroadcasts() {
        // Arrange
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        presenceService.markOnline(userId, "alice");

        // Assert: Redis set with TTL
        verify(valueOperations).set(
                eq(PresenceService.PRESENCE_KEY_PREFIX + userId),
                eq("1"),
                eq(Duration.ofSeconds(PresenceService.PRESENCE_TTL_SECONDS))
        );

        // Assert: user DB persisted
        verify(userRepository).save(argThat(User::isOnline));

        // Assert: broadcast to /topic/presence
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/presence"), payloadCaptor.capture());

        assertThat(payloadCaptor.getValue()).isInstanceOf(StompEventPayload.class);
        StompEventPayload<?> event = (StompEventPayload<?>) payloadCaptor.getValue();
        assertThat(event.eventType()).isEqualTo("PRESENCE_UPDATE");
        PresenceDto dto = (PresenceDto) event.data();
        assertThat(dto.userId()).isEqualTo(userId);
        assertThat(dto.username()).isEqualTo("alice");
        assertThat(dto.isOnline()).isTrue();
    }

    @Test
    @DisplayName("markOffline deletes Redis key, updates DB with last_seen_at, and broadcasts")
    void markOffline_deletesRedisAndPersistsAndBroadcasts() {
        // Arrange
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        presenceService.markOffline(userId, "alice");

        // Assert: Redis key deleted
        verify(redisTemplate).delete(eq(PresenceService.PRESENCE_KEY_PREFIX + userId));

        // Assert: DB updated with isOnline=false and lastSeenAt set
        verify(userRepository).save(argThat(u -> !u.isOnline() && u.getLastSeenAt() != null));

        // Assert: broadcast to /topic/presence
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/presence"), payloadCaptor.capture());

        StompEventPayload<?> event = (StompEventPayload<?>) payloadCaptor.getValue();
        assertThat(event.eventType()).isEqualTo("PRESENCE_UPDATE");
        PresenceDto dto = (PresenceDto) event.data();
        assertThat(dto.isOnline()).isFalse();
        assertThat(dto.lastSeenAt()).isNotNull();
    }

    @Test
    @DisplayName("refreshHeartbeat resets the Redis TTL")
    void refreshHeartbeat_resetsTtl() {
        // Act
        presenceService.refreshHeartbeat(userId);

        // Assert
        verify(redisTemplate).expire(
                eq(PresenceService.PRESENCE_KEY_PREFIX + userId),
                eq(Duration.ofSeconds(PresenceService.PRESENCE_TTL_SECONDS))
        );
    }

    @Test
    @DisplayName("isOnline returns true when key exists in Redis")
    void isOnline_returnsTrueWhenKeyExists() {
        // Arrange
        when(redisTemplate.hasKey(PresenceService.PRESENCE_KEY_PREFIX + userId)).thenReturn(Boolean.TRUE);

        // Act & Assert
        assertThat(presenceService.isOnline(userId)).isTrue();
    }

    @Test
    @DisplayName("isOnline returns false when key is absent")
    void isOnline_returnsFalseWhenKeyAbsent() {
        // Arrange
        when(redisTemplate.hasKey(PresenceService.PRESENCE_KEY_PREFIX + userId)).thenReturn(Boolean.FALSE);

        // Act & Assert
        assertThat(presenceService.isOnline(userId)).isFalse();
    }
}
