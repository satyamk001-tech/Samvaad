package com.samvaad.messaging.service;

import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.conversation.entity.Conversation;
import com.samvaad.conversation.repository.ConversationRepository;
import com.samvaad.conversation.service.ConversationService;
import com.samvaad.messaging.dto.*;
import com.samvaad.messaging.entity.*;
import com.samvaad.messaging.repository.MessageRepository;
import com.samvaad.messaging.repository.MessageStatusRepository;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
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
    private final com.samvaad.common.outbox.OutboxService outboxService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final com.samvaad.conversation.repository.ConversationMemberRepository memberRepository;
    private final com.samvaad.user.repository.UserBlockRepository userBlockRepository;

    public StompMessagingService(
            MessageRepository messageRepository,
            MessageStatusRepository messageStatusRepository,
            ConversationRepository conversationRepository,
            UserRepository userRepository,
            ConversationService conversationService,
            SimpMessagingTemplate messagingTemplate,
            com.samvaad.common.outbox.OutboxService outboxService,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
            com.samvaad.conversation.repository.ConversationMemberRepository memberRepository,
            com.samvaad.user.repository.UserBlockRepository userBlockRepository
    ) {
        this.messageRepository = messageRepository;
        this.messageStatusRepository = messageStatusRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.conversationService = conversationService;
        this.messagingTemplate = messagingTemplate;
        this.outboxService = outboxService;
        this.jdbcTemplate = jdbcTemplate;
        this.memberRepository = memberRepository;
        this.userBlockRepository = userBlockRepository;
    }

    @Transactional
    public MessageDto processIncomingMessage(UUID senderId, StompSendMessagePayload payload) {
        // Enforce membership authorization
        conversationService.validateMembership(payload.conversationId(), senderId);

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender user not found"));

        Conversation conversation = conversationRepository.findById(payload.conversationId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (conversation.getType() == com.samvaad.conversation.entity.ConversationType.DIRECT && memberRepository != null && userBlockRepository != null) {
            var members = memberRepository.findByConversationIdAndLeftAtIsNull(conversation.getId());
            if (members != null) {
                for (var m : members) {
                    if (m.getUser() != null && !m.getUser().getId().equals(senderId)) {
                        if (userBlockRepository.isBlockedEitherWay(senderId, m.getUser().getId())) {
                            throw new com.samvaad.common.exception.BadRequestException("Cannot send message: blocked by user or privacy restrictions.");
                        }
                    }
                }
            }
        }

        Message replyTo = null;
        if (payload.replyToMessageId() != null) {
            replyTo = messageRepository.findById(payload.replyToMessageId()).orElse(null);
        }

        MessageType messageType = payload.type() != null ? payload.type() : MessageType.TEXT;

        User forwardedFrom = null;
        if (Boolean.TRUE.equals(payload.isForwarded()) && payload.forwardedFromId() != null) {
            forwardedFrom = userRepository.findById(payload.forwardedFromId()).orElse(null);
        }

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .replyToMessage(replyTo)
                .content(payload.content().trim())
                .type(messageType)
                .isEdited(false)
                .isDeleted(false)
                .isViewOnce(Boolean.TRUE.equals(payload.isViewOnce()))
                .isForwarded(Boolean.TRUE.equals(payload.isForwarded()))
                .forwardedFrom(forwardedFrom)
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

        MessageDto messageDto = MessageDto.fromEntity(savedMessage, MessageStatusType.SENT, java.util.List.of());

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

        // Broadcast to conversation topic so active chat area immediately reflects double tick
        messagingTemplate.convertAndSend(
                "/topic/conversations." + payload.conversationId(),
                StompEventPayload.of("DELIVERY_STATUS", java.util.Map.of(
                        "messageId", message.getId().toString(),
                        "conversationId", payload.conversationId().toString(),
                        "status", "DELIVERED"
                ))
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

        // Broadcast to conversation topic so active chat area immediately reflects double blue tick
        messagingTemplate.convertAndSend(
                "/topic/conversations." + payload.conversationId(),
                StompEventPayload.of("DELIVERY_STATUS", java.util.Map.of(
                        "messageId", message.getId().toString(),
                        "conversationId", payload.conversationId().toString(),
                        "status", "READ"
                ))
        );
    }

    @Transactional
    public void toggleReaction(UUID userId, StompReactionPayload payload) {
        conversationService.validateMembership(payload.conversationId(), userId);

        Message message = messageRepository.findById(payload.messageId())
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        User reactingUser = userRepository.findById(userId).orElse(null);
        String username = reactingUser != null ? reactingUser.getUsername() : "";

        Integer existing = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
                Integer.class,
                message.getId(), userId, payload.emoji()
        );

        boolean added = false;
        if (existing != null && existing > 0) {
            jdbcTemplate.update(
                    "DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
                    message.getId(), userId, payload.emoji()
            );
        } else {
            jdbcTemplate.update(
                    "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)",
                    message.getId(), userId, payload.emoji()
            );
            added = true;
        }

        // Broadcast reaction event to conversation with action and username
        messagingTemplate.convertAndSend(
                "/topic/conversations." + payload.conversationId(),
                StompEventPayload.of("REACTION", java.util.Map.of(
                        "messageId", payload.messageId().toString(),
                        "userId", userId.toString(),
                        "username", username,
                        "action", added ? "ADDED" : "REMOVED",
                        "emoji", payload.emoji(),
                        "added", added
                ))
        );
    }

    @Transactional
    public void markViewedOnce(UUID userId, UUID conversationId, UUID messageId) {
        conversationService.validateMembership(conversationId, userId);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (message.isViewOnce() && message.getViewedAt() == null) {
            message.setViewedAt(Instant.now());
            messageRepository.save(message);

            messagingTemplate.convertAndSend(
                    "/topic/conversations." + conversationId,
                    StompEventPayload.of("MESSAGE_VIEWED_ONCE", java.util.Map.of(
                            "messageId", messageId.toString(),
                            "conversationId", conversationId.toString(),
                            "viewedAt", message.getViewedAt().toString()
                    ))
            );
        }
    }
}
