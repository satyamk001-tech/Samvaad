package com.samvaad.messaging.service;

import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.conversation.entity.Conversation;
import com.samvaad.conversation.service.ConversationService;
import com.samvaad.messaging.dto.EditMessageRequest;
import com.samvaad.messaging.dto.MessageDto;
import com.samvaad.messaging.entity.Message;
import com.samvaad.messaging.repository.MessageRepository;
import com.samvaad.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ConversationService conversationService;

    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Mock
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    private MessageService messageService;

    @BeforeEach
    void setUp() {
        messageService = new MessageService(messageRepository, conversationService, jdbcTemplate, messagingTemplate);
    }

    @Test
    void shouldFetchConversationMessagesWhenUserIsMember() {
        UUID conversationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User sender = User.builder().id(userId).username("elena").displayName("Elena").build();
        Conversation conversation = Conversation.builder().id(conversationId).build();
        Message message = Message.builder().id(UUID.randomUUID()).conversation(conversation).sender(sender).content("Hello World").build();

        Page<Message> messagePage = new PageImpl<>(List.of(message));

        doNothing().when(conversationService).validateMembership(conversationId, userId);
        when(messageRepository.findByConversationIdOrderByCreatedAtDesc(eq(conversationId), any(Pageable.class)))
                .thenReturn(messagePage);

        Page<MessageDto> result = messageService.getConversationMessages(conversationId, userId, 0, 50);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Hello World", result.getContent().get(0).content());
    }

    @Test
    void shouldAllowSenderToEditMessage() {
        UUID messageId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        User sender = User.builder().id(userId).username("elena").displayName("Elena").build();
        Conversation conversation = Conversation.builder().id(UUID.randomUUID()).build();
        Message message = Message.builder().id(messageId).conversation(conversation).sender(sender).content("Old text").isEdited(false).build();

        EditMessageRequest editRequest = new EditMessageRequest("Updated text");

        when(messageRepository.findById(messageId)).thenReturn(Optional.of(message));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MessageDto edited = messageService.editMessage(messageId, userId, editRequest);

        assertNotNull(edited);
        assertEquals("Updated text", edited.content());
        assertTrue(edited.isEdited());
    }

    @Test
    void shouldThrowUnauthorizedExceptionWhenNonSenderTriesToEditMessage() {
        UUID messageId = UUID.randomUUID();
        UUID senderId = UUID.randomUUID();
        UUID hackerId = UUID.randomUUID();

        User sender = User.builder().id(senderId).username("elena").build();
        Message message = Message.builder().id(messageId).sender(sender).content("Original text").build();

        EditMessageRequest editRequest = new EditMessageRequest("Hacked text");

        when(messageRepository.findById(messageId)).thenReturn(Optional.of(message));

        assertThrows(UnauthorizedException.class, () -> messageService.editMessage(messageId, hackerId, editRequest));
    }
}
