package com.viora.signaling.service;

import com.viora.common.exception.BadRequestException;
import com.viora.common.exception.ResourceNotFoundException;
import com.viora.common.exception.UnauthorizedException;
import com.viora.conversation.entity.Conversation;
import com.viora.conversation.repository.ConversationRepository;
import com.viora.messaging.dto.StompEventPayload;
import com.viora.signaling.dto.CallDto;
import com.viora.signaling.dto.InitiateCallRequest;
import com.viora.signaling.dto.SignalingMessage;
import com.viora.signaling.entity.Call;
import com.viora.signaling.entity.CallStatus;
import com.viora.signaling.repository.CallRepository;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class SignalingService {

    private final CallRepository callRepository;
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public SignalingService(
            CallRepository callRepository,
            UserRepository userRepository,
            ConversationRepository conversationRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.callRepository = callRepository;
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public CallDto initiateCall(UUID callerId, InitiateCallRequest request) {
        if (callerId.equals(request.receiverId())) {
            throw new BadRequestException("Cannot call yourself");
        }

        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResourceNotFoundException("Caller not found"));

        User receiver = userRepository.findById(request.receiverId())
                .orElseThrow(() -> new ResourceNotFoundException("Receiver not found"));

        Conversation conversation = null;
        if (request.conversationId() != null) {
            conversation = conversationRepository.findById(request.conversationId()).orElse(null);
        }

        Call call = Call.builder()
                .caller(caller)
                .receiver(receiver)
                .conversation(conversation)
                .type(request.type())
                .status(CallStatus.INITIATING)
                .build();

        Call savedCall = callRepository.save(call);
        CallDto callDto = CallDto.fromEntity(savedCall);

        // Notify receiver via their private STOMP queue
        messagingTemplate.convertAndSendToUser(
                receiver.getUsername(),
                "/queue/messages",
                StompEventPayload.of("INCOMING_CALL", callDto)
        );

        return callDto;
    }

    @Transactional
    public void processSignalingMessage(UUID senderId, SignalingMessage message) {
        Call call = callRepository.findById(message.callId())
                .orElseThrow(() -> new ResourceNotFoundException("Call not found: " + message.callId()));

        // Authorize that sender is either caller or receiver
        boolean isCaller = call.getCaller().getId().equals(senderId);
        boolean isReceiver = call.getReceiver().getId().equals(senderId);

        if (!isCaller && !isReceiver) {
            throw new UnauthorizedException("User is not a participant in this call");
        }

        User targetUser = userRepository.findById(message.targetUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found: " + message.targetUserId()));

        String type = message.type().toUpperCase();

        switch (type) {
            case "RINGING" -> {
                call.setStatus(CallStatus.RINGING);
                callRepository.save(call);
            }
            case "ACCEPT" -> {
                call.setStatus(CallStatus.ACCEPTED);
                callRepository.save(call);
            }
            case "CONNECTED" -> {
                call.setStatus(CallStatus.CONNECTED);
                callRepository.save(call);
            }
            case "REJECT" -> {
                call.setStatus(CallStatus.REJECTED);
                call.setEndedAt(Instant.now());
                callRepository.save(call);
            }
            case "END" -> {
                call.setStatus(CallStatus.ENDED);
                call.setEndedAt(Instant.now());
                if (call.getStartedAt() != null) {
                    long seconds = Duration.between(call.getStartedAt(), call.getEndedAt()).getSeconds();
                    call.setDurationSeconds((int) Math.max(0, seconds));
                }
                callRepository.save(call);
            }
        }

        // Relay signaling frame (OFFER, ANSWER, ICE_CANDIDATE, etc.) directly to recipient's private STOMP queue
        messagingTemplate.convertAndSendToUser(
                targetUser.getUsername(),
                "/queue/messages",
                StompEventPayload.of("CALL_SIGNAL", message)
        );
    }

    @Transactional(readOnly = true)
    public Page<CallDto> getUserCallHistory(UUID userId, Pageable pageable) {
        return callRepository.findUserCallHistory(userId, pageable)
                .map(CallDto::fromEntity);
    }
}
