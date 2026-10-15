package com.samvaad.group.service;

import com.samvaad.common.exception.BadRequestException;
import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.conversation.dto.ConversationDto;
import com.samvaad.conversation.entity.Conversation;
import com.samvaad.conversation.entity.ConversationMember;
import com.samvaad.conversation.entity.ConversationRole;
import com.samvaad.conversation.entity.ConversationType;
import com.samvaad.conversation.repository.ConversationMemberRepository;
import com.samvaad.conversation.repository.ConversationRepository;
import com.samvaad.group.dto.AddGroupMembersRequest;
import com.samvaad.group.dto.UpdateGroupMetadataRequest;
import com.samvaad.group.dto.UpdateMemberRoleRequest;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GroupService Tests")
class GroupServiceTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationMemberRepository memberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private GroupService groupService;

    private UUID groupId;
    private UUID adminId;
    private UUID memberId;
    private Conversation group;
    private User adminUser;
    private User regularUser;
    private ConversationMember adminMember;
    private ConversationMember regularMember;

    @BeforeEach
    void setUp() {
        groupId = UUID.randomUUID();
        adminId = UUID.randomUUID();
        memberId = UUID.randomUUID();

        adminUser = new User();
        adminUser.setId(adminId);
        adminUser.setUsername("admin");
        adminUser.setEmail("admin@samvaad.gov.in");

        regularUser = new User();
        regularUser.setId(memberId);
        regularUser.setUsername("bob");
        regularUser.setEmail("bob@samvaad.gov.in");

        group = Conversation.builder()
                .type(ConversationType.GROUP)
                .title("Alpha Team")
                .createdBy(adminUser)
                .build();
        group.setId(groupId);

        adminMember = ConversationMember.builder()
                .conversation(group)
                .user(adminUser)
                .role(ConversationRole.ADMIN)
                .build();
        adminMember.setId(UUID.randomUUID());

        regularMember = ConversationMember.builder()
                .conversation(group)
                .user(regularUser)
                .role(ConversationRole.MEMBER)
                .build();
        regularMember.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("addMembers successfully adds new user to group")
    void addMembers_success() {
        UUID newUserId = UUID.randomUUID();
        User newUser = new User();
        newUser.setId(newUserId);
        newUser.setUsername("charlie");

        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepository.isAdmin(groupId, adminId)).thenReturn(true);
        when(userRepository.findById(newUserId)).thenReturn(Optional.of(newUser));
        when(memberRepository.findByConversationIdAndUserId(groupId, newUserId)).thenReturn(Optional.empty());
        when(memberRepository.save(any(ConversationMember.class))).thenAnswer(i -> i.getArgument(0));
        when(memberRepository.findByConversationIdAndLeftAtIsNull(groupId))
                .thenReturn(List.of(adminMember, regularMember));

        ConversationDto result = groupService.addMembers(groupId, adminId, new AddGroupMembersRequest(List.of(newUserId)));

        assertThat(result).isNotNull();
        verify(memberRepository).save(argThat(m -> m.getUser().getId().equals(newUserId) && m.getRole() == ConversationRole.MEMBER));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations." + groupId), any(Object.class));
    }

    @Test
    @DisplayName("addMembers throws UnauthorizedException if caller is not admin")
    void addMembers_nonAdmin_throwsUnauthorized() {
        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepository.isAdmin(groupId, memberId)).thenReturn(false);

        assertThatThrownBy(() -> groupService.addMembers(groupId, memberId, new AddGroupMembersRequest(List.of(UUID.randomUUID()))))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Only group admins");

        verify(memberRepository, never()).save(any());
    }

    @Test
    @DisplayName("addMembers throws BadRequestException if target user is already an active member")
    void addMembers_alreadyMember_throwsBadRequest() {
        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepository.isAdmin(groupId, adminId)).thenReturn(true);
        when(userRepository.findById(memberId)).thenReturn(Optional.of(regularUser));
        when(memberRepository.findByConversationIdAndUserId(groupId, memberId)).thenReturn(Optional.of(regularMember));

        assertThatThrownBy(() -> groupService.addMembers(groupId, adminId, new AddGroupMembersRequest(List.of(memberId))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already an active member");

        verify(memberRepository, never()).save(any());
    }

    @Test
    @DisplayName("removeMember marks leftAt, notifies group topic and user private queue")
    void removeMember_success() {
        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepository.isAdmin(groupId, adminId)).thenReturn(true);
        when(memberRepository.findByConversationIdAndUserIdAndLeftAtIsNull(groupId, memberId))
                .thenReturn(Optional.of(regularMember));
        when(memberRepository.findByConversationIdAndLeftAtIsNull(groupId)).thenReturn(List.of(adminMember));

        ConversationDto result = groupService.removeMember(groupId, adminId, memberId);

        assertThat(result).isNotNull();
        assertThat(regularMember.getLeftAt()).isNotNull();
        verify(memberRepository).save(regularMember);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations." + groupId), any(Object.class));
        verify(messagingTemplate).convertAndSendToUser(eq("bob"), eq("/queue/messages"), any(Object.class));
    }

    @Test
    @DisplayName("removeMember throws BadRequestException if admin attempts to remove themselves")
    void removeMember_selfRemove_throwsBadRequest() {
        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepository.isAdmin(groupId, adminId)).thenReturn(true);

        assertThatThrownBy(() -> groupService.removeMember(groupId, adminId, adminId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Use the leave group endpoint");

        verify(memberRepository, never()).save(any());
    }

    @Test
    @DisplayName("leaveGroup sets leftAt and automatically promotes next member if sole admin leaves")
    void leaveGroup_soleAdminLeaves_promotesNextMember() {
        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepository.findByConversationIdAndUserIdAndLeftAtIsNull(groupId, adminId))
                .thenReturn(Optional.of(adminMember));
        // Remaining members after admin leaves
        when(memberRepository.findByConversationIdAndLeftAtIsNull(groupId))
                .thenReturn(List.of(regularMember));

        groupService.leaveGroup(groupId, adminId);

        assertThat(adminMember.getLeftAt()).isNotNull();
        verify(memberRepository).save(adminMember);
        // Regular member promoted to ADMIN
        verify(memberRepository).save(argThat(m -> m.getId().equals(regularMember.getId()) && m.getRole() == ConversationRole.ADMIN));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations." + groupId), any(Object.class));
    }

    @Test
    @DisplayName("updateMemberRole updates role and broadcasts update")
    void updateMemberRole_success() {
        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepository.isAdmin(groupId, adminId)).thenReturn(true);
        when(memberRepository.findByConversationIdAndUserIdAndLeftAtIsNull(groupId, memberId))
                .thenReturn(Optional.of(regularMember));
        when(memberRepository.findByConversationIdAndLeftAtIsNull(groupId))
                .thenReturn(List.of(adminMember, regularMember));

        ConversationDto result = groupService.updateMemberRole(groupId, adminId, memberId, new UpdateMemberRoleRequest(ConversationRole.ADMIN));

        assertThat(result).isNotNull();
        assertThat(regularMember.getRole()).isEqualTo(ConversationRole.ADMIN);
        verify(memberRepository).save(regularMember);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations." + groupId), any(Object.class));
    }

    @Test
    @DisplayName("updateGroupMetadata updates title and avatar and broadcasts update")
    void updateGroupMetadata_success() {
        when(conversationRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepository.isAdmin(groupId, adminId)).thenReturn(true);
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(i -> i.getArgument(0));
        when(memberRepository.findByConversationIdAndLeftAtIsNull(groupId))
                .thenReturn(List.of(adminMember, regularMember));

        UpdateGroupMetadataRequest request = new UpdateGroupMetadataRequest("New Title", "https://img.io/avatar.png");
        ConversationDto result = groupService.updateGroupMetadata(groupId, adminId, request);

        assertThat(result).isNotNull();
        assertThat(group.getTitle()).isEqualTo("New Title");
        assertThat(group.getAvatarUrl()).isEqualTo("https://img.io/avatar.png");
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations." + groupId), any(Object.class));
    }
}
