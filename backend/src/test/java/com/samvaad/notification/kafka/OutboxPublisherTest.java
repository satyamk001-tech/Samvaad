package com.samvaad.notification.kafka;

import com.samvaad.common.outbox.OutboxEvent;
import com.samvaad.common.outbox.OutboxEventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OutboxPublisher Tests")
class OutboxPublisherTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    @InjectMocks
    private OutboxPublisher outboxPublisher;

    @Test
    @DisplayName("publishPendingEvents sends events to Kafka and marks processed")
    void publishPendingEvents_success() {
        OutboxEvent event = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .aggregateType("MESSAGE")
                .aggregateId("agg-01")
                .eventType("MESSAGE_SENT")
                .payload("{\"test\":\"data\"}")
                .processed(false)
                .build();
        event.setId(UUID.randomUUID());

        when(outboxEventRepository.findUnprocessedEvents(any(Pageable.class)))
                .thenReturn(List.of(event));
        when(kafkaTemplate.send(anyString(), anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));

        outboxPublisher.publishPendingEvents();

        verify(kafkaTemplate).send("samvaad.notifications", "agg-01", "{\"test\":\"data\"}");
        assertThat(event.isProcessed()).isTrue();
        verify(outboxEventRepository).save(event);
    }
}
