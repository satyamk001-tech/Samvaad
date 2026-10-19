package com.samvaad.conversation.service;

import com.samvaad.common.exception.BadRequestException;
import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.conversation.dto.*;
import com.samvaad.conversation.entity.*;
import com.samvaad.conversation.repository.ConversationMemberRepository;
import com.samvaad.conversation.repository.ConversationRepository;
import com.samvaad.conversation.repository.UserDeletedConversationRepository;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
import com.samvaad.user.repository.UserBlockRepository;
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
    private final UserBlockRepository userBlockRepository;
    private final UserDeletedConversationRepository userDeletedConversationRepository;

    public ConversationService(
            ConversationRepository conversationRepository,
            ConversationMemberRepository memberRepository,
            UserRepository userRepository,
            UserBlockRepository userBlockRepository,
            UserDeletedConversationRepository userDeletedConversationRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.userBlockRepository = userBlockRepository;
        this.userDeletedConversationRepository = userDeletedConversationRepository;
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

    @Transactional(readOnly = true)
    public List<ConversationDto> getPendingRequests(UUID currentUserId) {
        List<Conversation> requests = conversationRepository.findPendingRequestsByUserId(currentUserId);

        return requests.stream().map(conversation -> {
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

        if (userBlockRepository.isBlockedEitherWay(currentUserId, recipientId)) {
            throw new BadRequestException("Cannot message this user due to privacy settings or blocks.");
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient user not found"));

        // Check if direct conversation already exists
        return conversationRepository.findDirectBetweenUsers(currentUserId, recipientId)
                .map(conversation -> {
                    // If either user previously deleted this conversation, remove the deletion mark
                    userDeletedConversationRepository.deleteByUserIdAndConversationId(currentUserId, conversation.getId());
                    
                    List<ConversationMemberDto> members = memberRepository.findByConversationIdAndLeftAtIsNull(conversation.getId())
                            .stream()
                            .map(ConversationMemberDto::fromEntity)
                            .toList();
                    return ConversationDto.fromEntity(conversation, members);
                })
                .orElseGet(() -> {
                    // First contact starts as a PENDING request targeted at the recipient
                    Conversation conversation = Conversation.builder()
                            .type(ConversationType.DIRECT)
                            .createdBy(currentUser)
                            .status("PENDING")
                            .requestedTo(recipient)
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
    public ConversationDto acceptRequest(UUID conversationId, UUID currentUserId) {
        validateMembership(conversationId, currentUserId);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        conversation.setStatus("ACCEPTED");
        Conversation saved = conversationRepository.save(conversation);

        List<ConversationMemberDto> members = memberRepository.findByConversationIdAndLeftAtIsNull(conversationId)
                .stream()
                .map(ConversationMemberDto::fromEntity)
                .toList();

        return ConversationDto.fromEntity(saved, members);
    }

    @Transactional
    public ConversationDto rejectRequest(UUID conversationId, UUID currentUserId) {
        validateMembership(conversationId, currentUserId);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        conversation.setStatus("REJECTED");
        Conversation saved = conversationRepository.save(conversation);

        List<ConversationMemberDto> members = memberRepository.findByConversationIdAndLeftAtIsNull(conversationId)
                .stream()
                .map(ConversationMemberDto::fromEntity)
                .toList();

        return ConversationDto.fromEntity(saved, members);
    }

    @Transactional
    public void deleteConversationForUser(UUID conversationId, UUID currentUserId) {
        validateMembership(conversationId, currentUserId);

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        if (!userDeletedConversationRepository.existsByUserIdAndConversationId(currentUserId, conversationId)) {
            userDeletedConversationRepository.save(new UserDeletedConversation(currentUser, conversation));
        }
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
                .status("ACCEPTED")
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
