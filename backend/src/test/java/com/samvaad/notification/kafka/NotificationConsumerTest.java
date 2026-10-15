package com.samvaad.notification.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.samvaad.notification.dto.NotificationEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationConsumer Tests")
class NotificationConsumerTest {

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private NotificationConsumer notificationConsumer;

    @Test
    @DisplayName("handleNotification parses event, dedupes, and pushes to STOMP queue")
    void handleNotification_successAndDedup() throws Exception {
        UUID recipientId = UUID.randomUUID();
        Instant now = Instant.now();
        NotificationEvent event = new NotificationEvent(
                recipientId, "New Message", "Hello Alice", "MESSAGE", now
        );

        String json = "{\"recipientId\":\"" + recipientId + "\"}";
        when(objectMapper.readValue(eq(json), eq(NotificationEvent.class))).thenReturn(event);

        // First message delivery
        notificationConsumer.handleNotification(json);

        verify(messagingTemplate, times(1)).convertAndSendToUser(
                eq(recipientId.toString()),
                eq("/queue/notifications"),
                any()
        );

        // Immediate duplicate delivery should be deduplicated
        notificationConsumer.handleNotification(json);

        // MessagingTemplate should NOT be called again
        verify(messagingTemplate, times(1)).convertAndSendToUser(
                anyString(),
                anyString(),
                any()
        );
    }
}
