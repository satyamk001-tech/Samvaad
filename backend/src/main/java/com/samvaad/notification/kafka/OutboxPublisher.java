package com.samvaad.notification.kafka;

import com.samvaad.common.outbox.OutboxEvent;
import com.samvaad.common.outbox.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class OutboxPublisher {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);
    private static final String NOTIFICATIONS_TOPIC = "samvaad.notifications";

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public OutboxPublisher(OutboxEventRepository outboxEventRepository, KafkaTemplate<String, String> kafkaTemplate) {
        this.outboxEventRepository = outboxEventRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxEventRepository.findUnprocessedEvents(PageRequest.of(0, 50));
        if (pending.isEmpty()) return;

        for (OutboxEvent event : pending) {
            try {
                kafkaTemplate.send(NOTIFICATIONS_TOPIC, event.getAggregateId(), event.getPayload())
                        .whenComplete((result, ex) -> {
                            if (ex != null) {
                                log.warn("Failed to publish outbox event {} to Kafka: {}", event.getId(), ex.getMessage());
                            }
                        });
                event.setProcessed(true);
                outboxEventRepository.save(event);
            } catch (Exception ex) {
                log.warn("Error dispatching outbox event to Kafka (non-blocking for DB): {}", ex.getMessage());
            }
        }
    }
}
