package com.viora.messaging.service;

import com.viora.common.exception.ResourceNotFoundException;
import com.viora.common.exception.UnauthorizedException;
import com.viora.conversation.entity.Conversation;
import com.viora.conversation.entity.ConversationType;
import com.viora.conversation.repository.ConversationRepository;
import com.viora.conversation.service.ConversationService;
import com.viora.messaging.dto.MessageDto;
import com.viora.messaging.dto.StompAckPayload;
import com.viora.messaging.dto.StompEventPayload;
import com.viora.messaging.dto.StompReceiptPayload;
import com.viora.messaging.dto.StompSendMessagePayload;
import com.viora.messaging.entity.*;
import com.viora.messaging.repository.MessageRepository;
import com.viora.messaging.repository.MessageStatusRepository;
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
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StompMessagingService Tests")
class StompMessagingServiceTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private MessageStatusRepository messageStatusRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConversationService conversationService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private com.viora.common.outbox.OutboxService outboxService;

    @InjectMocks
    private StompMessagingService stompMessagingService;

    private UUID senderId;
    private UUID conversationId;
    private User sender;
    private Conversation conversation;
    private StompSendMessagePayload payload;
    private Message savedMessage;

    @BeforeEach
    void setUp() {
        senderId = UUID.randomUUID();
        conversationId = UUID.randomUUID();

        sender = new User();
        sender.setId(senderId);
        sender.setUsername("alice");
        sender.setEmail("alice@viora.io");
        sender.setPasswordHash("hashed");

        conversation = Conversation.builder()
                .type(ConversationType.DIRECT)
                .createdBy(sender)
                .build();
        conversation.setId(conversationId);

        payload = new StompSendMessagePayload(
                conversationId,
                "Hello, World!",
                MessageType.TEXT,
                null,          // no reply
                "temp-id-001"
        );

        savedMessage = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content("Hello, World!")
                .type(MessageType.TEXT)
                .isEdited(false)
                .isDeleted(false)
                .build();
        savedMessage.setId(UUID.randomUUID());
        savedMessage.setCreatedAt(Instant.now());
        savedMessage.setUpdatedAt(Instant.now());
    }

    // =========================================================
    // Happy-path: processIncomingMessage
    // =========================================================

    @Test
    @DisplayName("processIncomingMessage persists message and returns MessageDto")
    void processIncomingMessage_validPayload_persistsAndReturnsDto() {
        // Arrange
        doNothing().when(conversationService).validateMembership(conversationId, senderId);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
        when(messageStatusRepository.save(any(MessageStatus.class))).thenReturn(new MessageStatus());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        // Act
        MessageDto result = stompMessagingService.processIncomingMessage(senderId, payload);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.content()).isEqualTo("Hello, World!");

        verify(conversationService).validateMembership(conversationId, senderId);
        verify(messageRepository).save(any(Message.class));
        verify(messageStatusRepository).save(argThat(status ->
                status.getStatus() == MessageStatusType.SENT));
        verify(conversationRepository).save(conversation);
    }

    @Test
    @DisplayName("processIncomingMessage sends ACK back to sender via private queue")
    void processIncomingMessage_validPayload_sendsAckToSender() {
        // Arrange
        doNothing().when(conversationService).validateMembership(conversationId, senderId);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
        when(messageStatusRepository.save(any(MessageStatus.class))).thenReturn(new MessageStatus());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        // Act
        stompMessagingService.processIncomingMessage(senderId, payload);

        // Assert: ACK to sender's private queue
        ArgumentCaptor<String> usernameCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> destinationCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);

        verify(messagingTemplate).convertAndSendToUser(
                usernameCaptor.capture(),
                destinationCaptor.capture(),
                payloadCaptor.capture()
        );

        assertThat(usernameCaptor.getValue()).isEqualTo("alice");
        assertThat(destinationCaptor.getValue()).isEqualTo("/queue/messages");

        StompEventPayload<?> ackEvent = (StompEventPayload<?>) payloadCaptor.getValue();
        assertThat(ackEvent.eventType()).isEqualTo("MESSAGE_ACK");
        StompAckPayload ack = (StompAckPayload) ackEvent.data();
        assertThat(ack.tempId()).isEqualTo("temp-id-001");
        assertThat(ack.status()).isEqualTo(MessageStatusType.SENT);
        assertThat(ack.conversationId()).isEqualTo(conversationId);
    }

    @Test
    @DisplayName("processIncomingMessage broadcasts NEW_MESSAGE event to conversation topic")
    void processIncomingMessage_validPayload_broadcastsNewMessageEvent() {
        // Arrange
        doNothing().when(conversationService).validateMembership(conversationId, senderId);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
        when(messageStatusRepository.save(any(MessageStatus.class))).thenReturn(new MessageStatus());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        // Act
        stompMessagingService.processIncomingMessage(senderId, payload);

        // Assert: broadcast to conversation topic
        ArgumentCaptor<String> topicCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> broadcastPayloadCaptor = ArgumentCaptor.forClass(Object.class);

        verify(messagingTemplate).convertAndSend(
                topicCaptor.capture(),
                broadcastPayloadCaptor.capture()
        );

        assertThat(topicCaptor.getValue()).isEqualTo("/topic/conversations." + conversationId);
        StompEventPayload<?> event = (StompEventPayload<?>) broadcastPayloadCaptor.getValue();
        assertThat(event.eventType()).isEqualTo("NEW_MESSAGE");
    }

    @Test
    @DisplayName("processIncomingMessage with reply message sets replyToMessage on entity")
    void processIncomingMessage_withReplyToId_setsReplyToMessage() {
        // Arrange
        UUID replyMsgId = UUID.randomUUID();
        Message replyMsg = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content("Original message")
                .type(MessageType.TEXT)
                .isEdited(false)
                .isDeleted(false)
                .build();
        replyMsg.setId(replyMsgId);

        StompSendMessagePayload replyPayload = new StompSendMessagePayload(
                conversationId, "Replying to you!", MessageType.TEXT, replyMsgId, "temp-id-002"
        );

        doNothing().when(conversationService).validateMembership(conversationId, senderId);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(messageRepository.findById(replyMsgId)).thenReturn(Optional.of(replyMsg));
        when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
        when(messageStatusRepository.save(any(MessageStatus.class))).thenReturn(new MessageStatus());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        // Act
        stompMessagingService.processIncomingMessage(senderId, replyPayload);

        // Assert: message saved with replyToMessage
        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(messageCaptor.capture());
        assertThat(messageCaptor.getValue().getReplyToMessage()).isEqualTo(replyMsg);
    }

    // =========================================================
    // Error cases
    // =========================================================

    @Test
    @DisplayName("processIncomingMessage throws UnauthorizedException if not a conversation member")
    void processIncomingMessage_nonMember_throwsUnauthorizedException() {
        // Arrange
        doThrow(new UnauthorizedException("User is not an active member of this conversation"))
                .when(conversationService).validateMembership(conversationId, senderId);

        // Act & Assert
        assertThatThrownBy(() -> stompMessagingService.processIncomingMessage(senderId, payload))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("not an active member");

        verify(messageRepository, never()).save(any());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("processIncomingMessage throws ResourceNotFoundException if sender user does not exist")
    void processIncomingMessage_senderNotFound_throwsResourceNotFoundException() {
        // Arrange
        doNothing().when(conversationService).validateMembership(conversationId, senderId);
        when(userRepository.findById(senderId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> stompMessagingService.processIncomingMessage(senderId, payload))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Sender user not found");

        verify(messageRepository, never()).save(any());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("processIncomingMessage throws ResourceNotFoundException if conversation does not exist")
    void processIncomingMessage_conversationNotFound_throwsResourceNotFoundException() {
        // Arrange
        doNothing().when(conversationService).validateMembership(conversationId, senderId);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> stompMessagingService.processIncomingMessage(senderId, payload))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Conversation not found");

        verify(messageRepository, never()).save(any());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("processIncomingMessage defaults type to TEXT when payload type is null")
    void processIncomingMessage_nullType_defaultsToText() {
        // Arrange
        StompSendMessagePayload nullTypePayload = new StompSendMessagePayload(
                conversationId, "No type specified", null, null, "temp-id-003"
        );

        doNothing().when(conversationService).validateMembership(conversationId, senderId);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
        when(messageStatusRepository.save(any(MessageStatus.class))).thenReturn(new MessageStatus());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        // Act
        stompMessagingService.processIncomingMessage(senderId, nullTypePayload);

        // Assert: message built with TEXT type
        ArgumentCaptor<Message> msgCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(msgCaptor.capture());
        assertThat(msgCaptor.getValue().getType()).isEqualTo(MessageType.TEXT);
    }

    @Test
    @DisplayName("processIncomingMessage trims whitespace from content before persisting")
    void processIncomingMessage_contentWithWhitespace_isTrimed() {
        // Arrange
        StompSendMessagePayload whitespacePayload = new StompSendMessagePayload(
                conversationId, "   Hello!   ", MessageType.TEXT, null, "temp-id-004"
        );

        doNothing().when(conversationService).validateMembership(conversationId, senderId);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(Message.class))).thenReturn(savedMessage);
        when(messageStatusRepository.save(any(MessageStatus.class))).thenReturn(new MessageStatus());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        // Act
        stompMessagingService.processIncomingMessage(senderId, whitespacePayload);

        // Assert: trimmed content
        ArgumentCaptor<Message> msgCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(msgCaptor.capture());
        assertThat(msgCaptor.getValue().getContent()).isEqualTo("Hello!");
    }

    // =========================================================
    // Receipt tests: markDelivered and markRead
    // =========================================================

    @Test
    @DisplayName("markDelivered updates status to DELIVERED and notifies sender")
    void markDelivered_updatesStatusAndNotifiesSender() {
        // Arrange
        UUID recipientId = UUID.randomUUID();
        User recipient = new User();
        recipient.setId(recipientId);
        recipient.setUsername("bob");

        StompReceiptPayload receiptPayload = new StompReceiptPayload(savedMessage.getId(), conversationId);

        doNothing().when(conversationService).validateMembership(conversationId, recipientId);
        when(messageRepository.findById(savedMessage.getId())).thenReturn(Optional.of(savedMessage));
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
        when(messageStatusRepository.findByMessageIdAndUserId(savedMessage.getId(), recipientId))
                .thenReturn(Optional.empty());

        // Act
        stompMessagingService.markDelivered(recipientId, receiptPayload);

        // Assert
        ArgumentCaptor<MessageStatus> statusCaptor = ArgumentCaptor.forClass(MessageStatus.class);
        verify(messageStatusRepository).save(statusCaptor.capture());
        assertThat(statusCaptor.getValue().getStatus()).isEqualTo(MessageStatusType.DELIVERED);

        verify(messagingTemplate).convertAndSendToUser(
                eq("alice"),
                eq("/queue/messages"),
                argThat(event -> {
                    if (event instanceof StompEventPayload<?> ep) {
                        return "MESSAGE_DELIVERED".equals(ep.eventType());
                    }
                    return false;
                })
        );
    }

    @Test
    @DisplayName("markDelivered does not overwrite READ status")
    void markDelivered_alreadyRead_doesNotOverwrite() {
        // Arrange
        UUID recipientId = UUID.randomUUID();
        User recipient = new User();
        recipient.setId(recipientId);

        MessageStatus existingStatus = MessageStatus.builder()
                .message(savedMessage)
                .user(recipient)
                .status(MessageStatusType.READ)
                .build();

        StompReceiptPayload receiptPayload = new StompReceiptPayload(savedMessage.getId(), conversationId);

        doNothing().when(conversationService).validateMembership(conversationId, recipientId);
        when(messageRepository.findById(savedMessage.getId())).thenReturn(Optional.of(savedMessage));
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
        when(messageStatusRepository.findByMessageIdAndUserId(savedMessage.getId(), recipientId))
                .thenReturn(Optional.of(existingStatus));

        // Act
        stompMessagingService.markDelivered(recipientId, receiptPayload);

        // Assert: status repository save is never called
        verify(messageStatusRepository, never()).save(any());
    }

    @Test
    @DisplayName("markRead updates status to READ and notifies sender")
    void markRead_updatesStatusAndNotifiesSender() {
        // Arrange
        UUID recipientId = UUID.randomUUID();
        User recipient = new User();
        recipient.setId(recipientId);
        recipient.setUsername("bob");

        StompReceiptPayload receiptPayload = new StompReceiptPayload(savedMessage.getId(), conversationId);

        doNothing().when(conversationService).validateMembership(conversationId, recipientId);
        when(messageRepository.findById(savedMessage.getId())).thenReturn(Optional.of(savedMessage));
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
        when(messageStatusRepository.findByMessageIdAndUserId(savedMessage.getId(), recipientId))
                .thenReturn(Optional.empty());

        // Act
        stompMessagingService.markRead(recipientId, receiptPayload);

        // Assert
        ArgumentCaptor<MessageStatus> statusCaptor = ArgumentCaptor.forClass(MessageStatus.class);
        verify(messageStatusRepository).save(statusCaptor.capture());
        assertThat(statusCaptor.getValue().getStatus()).isEqualTo(MessageStatusType.READ);

        verify(messagingTemplate).convertAndSendToUser(
                eq("alice"),
                eq("/queue/messages"),
                argThat(event -> {
                    if (event instanceof StompEventPayload<?> ep) {
                        return "MESSAGE_READ".equals(ep.eventType());
                    }
                    return false;
                })
        );
    }
}
