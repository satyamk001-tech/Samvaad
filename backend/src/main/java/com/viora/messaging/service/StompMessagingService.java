package com.viora.messaging.service;

import com.viora.common.exception.ResourceNotFoundException;
import com.viora.conversation.entity.Conversation;
import com.viora.conversation.repository.ConversationRepository;
import com.viora.conversation.service.ConversationService;
import com.viora.messaging.dto.*;
import com.viora.messaging.entity.*;
import com.viora.messaging.repository.MessageRepository;
import com.viora.messaging.repository.MessageStatusRepository;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class StompMessagingService {

    private final MessageRepository messageRepository;
    private final MessageStatusRepository messageStatusRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.viora.common.outbox.OutboxService outboxService;

    public StompMessagingService(
            MessageRepository messageRepository,
            MessageStatusRepository messageStatusRepository,
            ConversationRepository conversationRepository,
            UserRepository userRepository,
            ConversationService conversationService,
            SimpMessagingTemplate messagingTemplate,
            com.viora.common.outbox.OutboxService outboxService
    ) {
        this.messageRepository = messageRepository;
        this.messageStatusRepository = messageStatusRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.conversationService = conversationService;
        this.messagingTemplate = messagingTemplate;
        this.outboxService = outboxService;
    }

    @Transactional
    public MessageDto processIncomingMessage(UUID senderId, StompSendMessagePayload payload) {
        // Enforce membership authorization
        conversationService.validateMembership(payload.conversationId(), senderId);

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender user not found"));

        Conversation conversation = conversationRepository.findById(payload.conversationId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        Message replyTo = null;
        if (payload.replyToMessageId() != null) {
            replyTo = messageRepository.findById(payload.replyToMessageId()).orElse(null);
        }

        MessageType messageType = payload.type() != null ? payload.type() : MessageType.TEXT;

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .replyToMessage(replyTo)
                .content(payload.content().trim())
                .type(messageType)
                .isEdited(false)
                .isDeleted(false)
                .build();

        Message savedMessage = messageRepository.save(message);

        // Record SENT status for sender
        MessageStatus status = MessageStatus.builder()
                .message(savedMessage)
                .user(sender)
                .status(MessageStatusType.SENT)
                .build();
        messageStatusRepository.save(status);

        // Update conversation timestamp
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);

        MessageDto messageDto = MessageDto.fromEntity(savedMessage);

        // Record outbox event within the same database transaction
        outboxService.recordEvent(
                "MESSAGE",
                savedMessage.getId().toString(),
                "MESSAGE_SENT",
                messageDto
        );

        // 1. Send direct ACK back to sender's private queue
        StompAckPayload ackPayload = StompAckPayload.sent(payload.tempId(), savedMessage.getId(), conversation.getId());
        messagingTemplate.convertAndSendToUser(
                sender.getUsername(),
                "/queue/messages",
                StompEventPayload.of("MESSAGE_ACK", ackPayload)
        );

        // 2. Broadcast live message event to active conversation topic
        messagingTemplate.convertAndSend(
                "/topic/conversations." + conversation.getId(),
                StompEventPayload.of("NEW_MESSAGE", messageDto)
        );

        return messageDto;
    }

    @Transactional
    public void markDelivered(UUID userId, StompReceiptPayload payload) {
        conversationService.validateMembership(payload.conversationId(), userId);

        Message message = messageRepository.findById(payload.messageId())
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        MessageStatus status = messageStatusRepository.findByMessageIdAndUserId(message.getId(), userId)
                .orElseGet(() -> MessageStatus.builder()
                        .message(message)
                        .user(user)
                        .build());

        // Only update if not already READ
        if (status.getStatus() != MessageStatusType.READ) {
            status.setStatus(MessageStatusType.DELIVERED);
            status.setUpdatedAt(Instant.now());
            messageStatusRepository.save(status);
        }

        // Notify the message sender that their message has been delivered
        StompAckPayload receiptAck = StompAckPayload.delivered(message.getId(), payload.conversationId());
        messagingTemplate.convertAndSendToUser(
                message.getSender().getUsername(),
                "/queue/messages",
                StompEventPayload.of("MESSAGE_DELIVERED", receiptAck)
        );
    }

    @Transactional
    public void markRead(UUID userId, StompReceiptPayload payload) {
        conversationService.validateMembership(payload.conversationId(), userId);

        Message message = messageRepository.findById(payload.messageId())
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        MessageStatus status = messageStatusRepository.findByMessageIdAndUserId(message.getId(), userId)
                .orElseGet(() -> MessageStatus.builder()
                        .message(message)
                        .user(user)
                        .build());

        status.setStatus(MessageStatusType.READ);
        status.setUpdatedAt(Instant.now());
        messageStatusRepository.save(status);

        // Notify sender with READ_RECEIPT
        StompAckPayload receiptAck = StompAckPayload.read(message.getId(), payload.conversationId());
        messagingTemplate.convertAndSendToUser(
                message.getSender().getUsername(),
                "/queue/messages",
                StompEventPayload.of("MESSAGE_READ", receiptAck)
        );
    }
}
