package com.viora.signaling.service;

import com.viora.common.exception.BadRequestException;
import com.viora.common.exception.ResourceNotFoundException;
import com.viora.common.exception.UnauthorizedException;
import com.viora.messaging.dto.StompEventPayload;
import com.viora.signaling.dto.CallDto;
import com.viora.signaling.dto.InitiateCallRequest;
import com.viora.signaling.dto.SignalingMessage;
import com.viora.signaling.entity.Call;
import com.viora.signaling.entity.CallStatus;
import com.viora.signaling.entity.CallType;
import com.viora.signaling.repository.CallRepository;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SignalingService Tests")
class SignalingServiceTest {

    @Mock
    private CallRepository callRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private SignalingService signalingService;

    private UUID callerId;
    private UUID receiverId;
    private UUID callId;
    private User caller;
    private User receiver;
    private Call call;

    @BeforeEach
    void setUp() {
        callerId = UUID.randomUUID();
        receiverId = UUID.randomUUID();
        callId = UUID.randomUUID();

        caller = new User();
        caller.setId(callerId);
        caller.setUsername("alice");

        receiver = new User();
        receiver.setId(receiverId);
        receiver.setUsername("bob");

        call = Call.builder()
                .id(callId)
                .caller(caller)
                .receiver(receiver)
                .type(CallType.VIDEO)
                .status(CallStatus.INITIATING)
                .startedAt(Instant.now())
                .build();
        call.setId(callId);
    }

    @Test
    @DisplayName("initiateCall persists call and dispatches INCOMING_CALL to receiver queue")
    void initiateCall_success() {
        InitiateCallRequest request = new InitiateCallRequest(receiverId, null, CallType.VIDEO);

        when(userRepository.findById(callerId)).thenReturn(Optional.of(caller));
        when(userRepository.findById(receiverId)).thenReturn(Optional.of(receiver));
        when(callRepository.save(any(Call.class))).thenReturn(call);

        CallDto result = signalingService.initiateCall(callerId, request);

        assertThat(result).isNotNull();
        assertThat(result.type()).isEqualTo(CallType.VIDEO);
        assertThat(result.status()).isEqualTo(CallStatus.INITIATING);

        verify(callRepository).save(any(Call.class));
        verify(messagingTemplate).convertAndSendToUser(
                eq("bob"),
                eq("/queue/messages"),
                argThat(event -> {
                    if (event instanceof StompEventPayload<?> ep) {
                        return "INCOMING_CALL".equals(ep.eventType());
                    }
                    return false;
                })
        );
    }

    @Test
    @DisplayName("initiateCall throws BadRequestException if caller tries to call themselves")
    void initiateCall_callSelf_throwsBadRequest() {
        InitiateCallRequest request = new InitiateCallRequest(callerId, null, CallType.AUDIO);

        assertThatThrownBy(() -> signalingService.initiateCall(callerId, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot call yourself");

        verifyNoInteractions(callRepository);
    }

    @Test
    @DisplayName("processSignalingMessage routes OFFER to target user queue")
    void processSignalingMessage_offer_relayed() {
        SignalingMessage message = new SignalingMessage(callId, receiverId, "OFFER", "dummy-sdp-offer");

        when(callRepository.findById(callId)).thenReturn(Optional.of(call));
        when(userRepository.findById(receiverId)).thenReturn(Optional.of(receiver));

        signalingService.processSignalingMessage(callerId, message);

        verify(messagingTemplate).convertAndSendToUser(
                eq("bob"),
                eq("/queue/messages"),
                argThat(event -> {
                    if (event instanceof StompEventPayload<?> ep) {
                        return "CALL_SIGNAL".equals(ep.eventType());
                    }
                    return false;
                })
        );
    }

    @Test
    @DisplayName("processSignalingMessage updates status to ENDED and sets duration on END signal")
    void processSignalingMessage_endSignal_updatesCallStatus() {
        SignalingMessage message = new SignalingMessage(callId, callerId, "END", null);

        when(callRepository.findById(callId)).thenReturn(Optional.of(call));
        when(userRepository.findById(callerId)).thenReturn(Optional.of(caller));

        signalingService.processSignalingMessage(receiverId, message);

        assertThat(call.getStatus()).isEqualTo(CallStatus.ENDED);
        assertThat(call.getEndedAt()).isNotNull();
        verify(callRepository).save(call);
    }

    @Test
    @DisplayName("processSignalingMessage throws UnauthorizedException if sender is not caller or receiver")
    void processSignalingMessage_nonParticipant_throwsUnauthorized() {
        UUID thirdPartyId = UUID.randomUUID();
        SignalingMessage message = new SignalingMessage(callId, receiverId, "OFFER", "dummy-sdp");

        when(callRepository.findById(callId)).thenReturn(Optional.of(call));

        assertThatThrownBy(() -> signalingService.processSignalingMessage(thirdPartyId, message))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("not a participant");

        verifyNoInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("getUserCallHistory returns paginated call DTOs")
    void getUserCallHistory_success() {
        Pageable pageable = PageRequest.of(0, 10);
        when(callRepository.findUserCallHistory(callerId, pageable))
                .thenReturn(new PageImpl<>(List.of(call)));

        Page<CallDto> result = signalingService.getUserCallHistory(callerId, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).type()).isEqualTo(CallType.VIDEO);
    }
}
