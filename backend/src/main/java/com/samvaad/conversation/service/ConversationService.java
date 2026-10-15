package com.samvaad.conversation.service;

import com.samvaad.common.exception.BadRequestException;
import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.conversation.dto.*;
import com.samvaad.conversation.entity.*;
import com.samvaad.conversation.repository.ConversationMemberRepository;
import com.samvaad.conversation.repository.ConversationRepository;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final UserRepository userRepository;

    public ConversationService(
            ConversationRepository conversationRepository,
            ConversationMemberRepository memberRepository,
            UserRepository userRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public ConversationDto getConversationById(UUID conversationId, UUID currentUserId) {
        validateMembership(conversationId, currentUserId);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        List<ConversationMemberDto> members = memberRepository.findByConversationIdAndLeftAtIsNull(conversationId)
                .stream()
                .map(ConversationMemberDto::fromEntity)
                .toList();

        return ConversationDto.fromEntity(conversation, members);
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getUserConversations(UUID currentUserId) {
        List<Conversation> conversations = conversationRepository.findAllByUserId(currentUserId);
        
        return conversations.stream().map(conversation -> {
            List<ConversationMemberDto> members = memberRepository.findByConversationIdAndLeftAtIsNull(conversation.getId())
                    .stream()
                    .map(ConversationMemberDto::fromEntity)
                    .toList();
            return ConversationDto.fromEntity(conversation, members);
        }).toList();
    }

    @Transactional
    public ConversationDto createOrGetDirectConversation(UUID currentUserId, UUID recipientId) {
        if (currentUserId.equals(recipientId)) {
            throw new BadRequestException("Cannot create a direct conversation with yourself");
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient user not found"));

        // Check if direct conversation already exists
        return conversationRepository.findDirectBetweenUsers(currentUserId, recipientId)
                .map(conversation -> {
                    List<ConversationMemberDto> members = memberRepository.findByConversationIdAndLeftAtIsNull(conversation.getId())
                            .stream()
                            .map(ConversationMemberDto::fromEntity)
                            .toList();
                    return ConversationDto.fromEntity(conversation, members);
                })
                .orElseGet(() -> {
                    Conversation conversation = Conversation.builder()
                            .type(ConversationType.DIRECT)
                            .createdBy(currentUser)
                            .build();

                    Conversation savedConversation = conversationRepository.save(conversation);

                    ConversationMember member1 = ConversationMember.builder()
                            .conversation(savedConversation)
                            .user(currentUser)
                            .role(ConversationRole.ADMIN)
                            .build();

                    ConversationMember member2 = ConversationMember.builder()
                            .conversation(savedConversation)
                            .user(recipient)
                            .role(ConversationRole.ADMIN)
                            .build();

                    memberRepository.saveAll(List.of(member1, member2));

                    List<ConversationMemberDto> members = List.of(
                            ConversationMemberDto.fromEntity(member1),
                            ConversationMemberDto.fromEntity(member2)
                    );

                    return ConversationDto.fromEntity(savedConversation, members);
                });
    }

    @Transactional
    public ConversationDto createGroupConversation(UUID currentUserId, CreateGroupRequest request) {
        User creator = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Conversation group = Conversation.builder()
                .type(ConversationType.GROUP)
                .title(request.title().trim())
                .avatarUrl(request.avatarUrl())
                .createdBy(creator)
                .build();

        Conversation savedGroup = conversationRepository.save(group);

        List<ConversationMember> membersToSave = new ArrayList<>();
        
        // Creator is ADMIN
        membersToSave.add(ConversationMember.builder()
                .conversation(savedGroup)
                .user(creator)
                .role(ConversationRole.ADMIN)
                .build());

        // Add requested members as MEMBER
        for (UUID memberId : request.memberIds()) {
            if (!memberId.equals(currentUserId)) {
                User memberUser = userRepository.findById(memberId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found: " + memberId));
                membersToSave.add(ConversationMember.builder()
                        .conversation(savedGroup)
                        .user(memberUser)
                        .role(ConversationRole.MEMBER)
                        .build());
            }
        }

        List<ConversationMember> savedMembers = memberRepository.saveAll(membersToSave);
        List<ConversationMemberDto> memberDtos = savedMembers.stream().map(ConversationMemberDto::fromEntity).toList();

        return ConversationDto.fromEntity(savedGroup, memberDtos);
    }

    public void validateMembership(UUID conversationId, UUID userId) {
        if (!memberRepository.isMember(conversationId, userId)) {
            throw new UnauthorizedException("User is not an active member of this conversation");
        }
    }
}
