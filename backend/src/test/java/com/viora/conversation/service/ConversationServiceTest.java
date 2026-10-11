package com.viora.conversation.service;

import com.viora.common.exception.BadRequestException;
import com.viora.common.exception.UnauthorizedException;
import com.viora.conversation.dto.ConversationDto;
import com.viora.conversation.dto.CreateGroupRequest;
import com.viora.conversation.entity.Conversation;
import com.viora.conversation.entity.ConversationMember;
import com.viora.conversation.entity.ConversationType;
import com.viora.conversation.repository.ConversationMemberRepository;
import com.viora.conversation.repository.ConversationRepository;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationMemberRepository memberRepository;

    @Mock
    private UserRepository userRepository;

    private ConversationService conversationService;

    @BeforeEach
    void setUp() {
        conversationService = new ConversationService(conversationRepository, memberRepository, userRepository);
    }

    @Test
    void shouldCreateNewDirectConversationWhenNoneExists() {
        UUID user1Id = UUID.randomUUID();
        UUID user2Id = UUID.randomUUID();

        User user1 = User.builder().id(user1Id).username("alice").displayName("Alice").build();
        User user2 = User.builder().id(user2Id).username("bob").displayName("Bob").build();

        when(userRepository.findById(user1Id)).thenReturn(Optional.of(user1));
        when(userRepository.findById(user2Id)).thenReturn(Optional.of(user2));
        when(conversationRepository.findDirectBetweenUsers(user1Id, user2Id)).thenReturn(Optional.empty());

        Conversation savedConversation = Conversation.builder()
                .id(UUID.randomUUID())
                .type(ConversationType.DIRECT)
                .createdBy(user1)
                .build();

        when(conversationRepository.save(any(Conversation.class))).thenReturn(savedConversation);

        ConversationDto result = conversationService.createOrGetDirectConversation(user1Id, user2Id);

        assertNotNull(result);
        assertEquals(ConversationType.DIRECT, result.type());
        verify(memberRepository).saveAll(anyList());
    }

    @Test
    void shouldThrowBadRequestWhenCreatingDirectChatWithSelf() {
        UUID userId = UUID.randomUUID();
        assertThrows(BadRequestException.class, () -> conversationService.createOrGetDirectConversation(userId, userId));
    }

    @Test
    void shouldCreateGroupConversationSuccessfully() {
        UUID creatorId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        User creator = User.builder().id(creatorId).username("alice").displayName("Alice").build();
        User member = User.builder().id(memberId).username("bob").displayName("Bob").build();

        CreateGroupRequest request = new CreateGroupRequest("Design Guild", null, List.of(memberId));

        when(userRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(userRepository.findById(memberId)).thenReturn(Optional.of(member));

        Conversation savedGroup = Conversation.builder()
                .id(UUID.randomUUID())
                .type(ConversationType.GROUP)
                .title("Design Guild")
                .createdBy(creator)
                .build();

        when(conversationRepository.save(any(Conversation.class))).thenReturn(savedGroup);
        when(memberRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        ConversationDto group = conversationService.createGroupConversation(creatorId, request);

        assertNotNull(group);
        assertEquals("Design Guild", group.title());
        assertEquals(ConversationType.GROUP, group.type());
    }

    @Test
    void shouldThrowUnauthorizedExceptionWhenUserIsNotMember() {
        UUID conversationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(memberRepository.isMember(conversationId, userId)).thenReturn(false);

        assertThrows(UnauthorizedException.class, () -> conversationService.getConversationById(conversationId, userId));
    }
}
