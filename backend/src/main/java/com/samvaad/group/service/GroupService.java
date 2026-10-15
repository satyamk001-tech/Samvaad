package com.samvaad.group.service;

import com.samvaad.common.exception.BadRequestException;
import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.conversation.dto.ConversationDto;
import com.samvaad.conversation.dto.ConversationMemberDto;
import com.samvaad.conversation.entity.Conversation;
import com.samvaad.conversation.entity.ConversationMember;
import com.samvaad.conversation.entity.ConversationRole;
import com.samvaad.conversation.entity.ConversationType;
import com.samvaad.conversation.repository.ConversationMemberRepository;
import com.samvaad.conversation.repository.ConversationRepository;
import com.samvaad.group.dto.AddGroupMembersRequest;
import com.samvaad.group.dto.UpdateGroupMetadataRequest;
import com.samvaad.group.dto.UpdateMemberRoleRequest;
import com.samvaad.messaging.dto.StompEventPayload;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class GroupService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public GroupService(
            ConversationRepository conversationRepository,
            ConversationMemberRepository memberRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ConversationDto addMembers(UUID groupId, UUID currentUserId, AddGroupMembersRequest request) {
        Conversation group = getGroupAndValidateAdmin(groupId, currentUserId);

        List<ConversationMember> addedMembers = new ArrayList<>();
        for (UUID userId : request.userIds()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

            // Check if user was previously in group or already active
            memberRepository.findByConversationIdAndUserId(groupId, userId)
                    .ifPresentOrElse(existingMember -> {
                        if (existingMember.getLeftAt() == null) {
                            throw new BadRequestException("User " + user.getUsername() + " is already an active member of this group");
                        }
                        // Re-join
                        existingMember.setLeftAt(null);
                        existingMember.setRole(ConversationRole.MEMBER);
                        addedMembers.add(memberRepository.save(existingMember));
                    }, () -> {
                        // Brand new member
                        ConversationMember newMember = ConversationMember.builder()
                                .conversation(group)
                                .user(user)
                                .role(ConversationRole.MEMBER)
                                .build();
                        addedMembers.add(memberRepository.save(newMember));
                    });
        }

        group.setUpdatedAt(Instant.now());
        conversationRepository.save(group);

        ConversationDto updatedGroup = buildConversationDto(group);

        // Broadcast to group topic
        messagingTemplate.convertAndSend(
                "/topic/conversations." + groupId,
                StompEventPayload.of("GROUP_MEMBERS_ADDED", Map.of(
                        "groupId", groupId,
                        "addedUserIds", request.userIds()
                ))
        );

        return updatedGroup;
    }

    @Transactional
    public ConversationDto removeMember(UUID groupId, UUID currentUserId, UUID targetUserId) {
        Conversation group = getGroupAndValidateAdmin(groupId, currentUserId);

        if (currentUserId.equals(targetUserId)) {
            throw new BadRequestException("Use the leave group endpoint to remove yourself from the group");
        }

        ConversationMember targetMember = memberRepository.findByConversationIdAndUserIdAndLeftAtIsNull(groupId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Active member not found in group: " + targetUserId));

        targetMember.setLeftAt(Instant.now());
        memberRepository.save(targetMember);

        group.setUpdatedAt(Instant.now());
        conversationRepository.save(group);

        ConversationDto updatedGroup = buildConversationDto(group);

        // Notify group topic
        messagingTemplate.convertAndSend(
                "/topic/conversations." + groupId,
                StompEventPayload.of("GROUP_MEMBER_REMOVED", Map.of(
                        "groupId", groupId,
                        "removedUserId", targetUserId
                ))
        );

        // Notify removed user directly on their private queue so their client can evict state/subscription
        messagingTemplate.convertAndSendToUser(
                targetMember.getUser().getUsername(),
                "/queue/messages",
                StompEventPayload.of("GROUP_MEMBER_REMOVED", Map.of("groupId", groupId))
        );

        return updatedGroup;
    }

    @Transactional
    public void leaveGroup(UUID groupId, UUID currentUserId) {
        Conversation group = conversationRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        if (group.getType() != ConversationType.GROUP) {
            throw new BadRequestException("Target conversation is not a group");
        }

        ConversationMember member = memberRepository.findByConversationIdAndUserIdAndLeftAtIsNull(groupId, currentUserId)
                .orElseThrow(() -> new UnauthorizedException("You are not an active member of this group"));

        member.setLeftAt(Instant.now());
        memberRepository.save(member);

        // If the leaving user was ADMIN, ensure at least one active admin remains if members exist
        List<ConversationMember> remainingActive = memberRepository.findByConversationIdAndLeftAtIsNull(groupId);
        if (!remainingActive.isEmpty()) {
            boolean hasAdmin = remainingActive.stream().anyMatch(m -> m.getRole() == ConversationRole.ADMIN);
            if (!hasAdmin) {
                ConversationMember nextAdmin = remainingActive.get(0);
                nextAdmin.setRole(ConversationRole.ADMIN);
                memberRepository.save(nextAdmin);
            }
        }

        group.setUpdatedAt(Instant.now());
        conversationRepository.save(group);

        // Notify group topic
        messagingTemplate.convertAndSend(
                "/topic/conversations." + groupId,
                StompEventPayload.of("GROUP_MEMBER_LEFT", Map.of(
                        "groupId", groupId,
                        "userId", currentUserId
                ))
        );
    }

    @Transactional
    public ConversationDto updateMemberRole(UUID groupId, UUID currentUserId, UUID targetUserId, UpdateMemberRoleRequest request) {
        Conversation group = getGroupAndValidateAdmin(groupId, currentUserId);

        ConversationMember targetMember = memberRepository.findByConversationIdAndUserIdAndLeftAtIsNull(groupId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Active member not found in group: " + targetUserId));

        targetMember.setRole(request.role());
        memberRepository.save(targetMember);

        group.setUpdatedAt(Instant.now());
        conversationRepository.save(group);

        ConversationDto updatedGroup = buildConversationDto(group);

        messagingTemplate.convertAndSend(
                "/topic/conversations." + groupId,
                StompEventPayload.of("GROUP_ROLE_UPDATED", Map.of(
                        "groupId", groupId,
                        "targetUserId", targetUserId,
                        "newRole", request.role()
                ))
        );

        return updatedGroup;
    }

    @Transactional
    public ConversationDto updateGroupMetadata(UUID groupId, UUID currentUserId, UpdateGroupMetadataRequest request) {
        Conversation group = getGroupAndValidateAdmin(groupId, currentUserId);

        if (request.title() != null && !request.title().isBlank()) {
            group.setTitle(request.title().trim());
        }
        if (request.avatarUrl() != null) {
            group.setAvatarUrl(request.avatarUrl().trim());
        }

        group.setUpdatedAt(Instant.now());
        Conversation savedGroup = conversationRepository.save(group);

        ConversationDto updatedGroup = buildConversationDto(savedGroup);

        messagingTemplate.convertAndSend(
                "/topic/conversations." + groupId,
                StompEventPayload.of("GROUP_METADATA_UPDATED", Map.of(
                        "groupId", groupId,
                        "title", savedGroup.getTitle() != null ? savedGroup.getTitle() : "",
                        "avatarUrl", savedGroup.getAvatarUrl() != null ? savedGroup.getAvatarUrl() : ""
                ))
        );

        return updatedGroup;
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    private Conversation getGroupAndValidateAdmin(UUID groupId, UUID userId) {
        Conversation group = conversationRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        if (group.getType() != ConversationType.GROUP) {
            throw new BadRequestException("Target conversation is not a group");
        }

        if (!memberRepository.isAdmin(groupId, userId)) {
            throw new UnauthorizedException("Only group admins can perform this action");
        }

        return group;
    }

    private ConversationDto buildConversationDto(Conversation conversation) {
        List<ConversationMemberDto> members = memberRepository.findByConversationIdAndLeftAtIsNull(conversation.getId())
                .stream()
                .map(ConversationMemberDto::fromEntity)
                .toList();
        return ConversationDto.fromEntity(conversation, members);
    }
}
