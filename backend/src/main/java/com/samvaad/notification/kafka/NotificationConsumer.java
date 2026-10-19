package com.samvaad.notification.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.samvaad.messaging.dto.StompEventPayload;
import com.samvaad.notification.dto.NotificationEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class NotificationConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    // Idempotency cache for deduplication
    private final Set<String> processedEventKeys = Collections.newSetFromMap(new ConcurrentHashMap<>());

    public NotificationConsumer(ObjectMapper objectMapper, SimpMessagingTemplate messagingTemplate) {
        this.objectMapper = objectMapper;
        this.messagingTemplate = messagingTemplate;
    }

    @KafkaListener(topics = "samvaad.notifications", groupId = "${spring.kafka.consumer.group-id:samvaad-group}")
    public void handleNotification(String messageJson) {
        try {
            NotificationEvent event = objectMapper.readValue(messageJson, NotificationEvent.class);
            String dedupKey = event.recipientId() + ":" + event.timestamp() + ":" + event.title();

            // Deduplicate incoming Kafka events
            if (processedEventKeys.contains(dedupKey)) {
                log.debug("Duplicate notification ignored: {}", dedupKey);
                return;
            }
            processedEventKeys.add(dedupKey);

            // Clean up cache periodically if it grows large
            if (processedEventKeys.size() > 5000) {
                processedEventKeys.clear();
            }

            // Dispatch notification to user's private queue
            messagingTemplate.convertAndSendToUser(
                    event.recipientId().toString(),
                    "/queue/notifications",
                    StompEventPayload.of("NOTIFICATION", event)
            );

            log.info("Notification dispatched to recipient: {}", event.recipientId());
        } catch (Exception ex) {
            log.error("Failed to process Kafka notification event: {}", ex.getMessage());
        }
    }
}
