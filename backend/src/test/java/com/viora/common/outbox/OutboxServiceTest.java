package com.viora.common.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OutboxService Tests")
class OutboxServiceTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private OutboxService outboxService;

    @Test
    @DisplayName("recordEvent serializes payload and persists outbox event")
    void recordEvent_success() throws JsonProcessingException {
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"message\":\"hello\"}");

        outboxService.recordEvent("MESSAGE", "msg-123", "MESSAGE_SENT", Map.of("message", "hello"));

        verify(outboxEventRepository).save(argThat(event ->
                "MESSAGE".equals(event.getAggregateType()) &&
                "msg-123".equals(event.getAggregateId()) &&
                "MESSAGE_SENT".equals(event.getEventType()) &&
                "{\"message\":\"hello\"}".equals(event.getPayload()) &&
                !event.isProcessed()
        ));
    }
}
