package com.samvaad.messaging.service;

import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.conversation.service.ConversationService;
import com.samvaad.messaging.dto.EditMessageRequest;
import com.samvaad.messaging.dto.MessageDto;
import com.samvaad.messaging.dto.ReactionSummaryDto;
import com.samvaad.messaging.entity.Message;
import com.samvaad.messaging.entity.MessageStatusType;
import com.samvaad.messaging.repository.MessageRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationService conversationService;
    private final JdbcTemplate jdbcTemplate;

    @org.springframework.beans.factory.annotation.Autowired
    public MessageService(
            MessageRepository messageRepository,
            ConversationService conversationService,
            JdbcTemplate jdbcTemplate
    ) {
        this.messageRepository = messageRepository;
        this.conversationService = conversationService;
        this.jdbcTemplate = jdbcTemplate;
    }

    public MessageService(
            MessageRepository messageRepository,
            ConversationService conversationService
    ) {
        this(messageRepository, conversationService, null);
    }

    @Transactional
    public Page<MessageDto> getConversationMessages(UUID conversationId, UUID currentUserId, int page, int size) {
        // Enforce security check: User MUST be an active member of conversation
        conversationService.validateMembership(conversationId, currentUserId);

        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Message> messagePage = messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);
        List<Message> messages = messagePage.getContent();

        if (messages.isEmpty()) {
            return Page.empty(pageable);
        }

        if (jdbcTemplate == null) {
            return messagePage.map(MessageDto::fromEntity);
        }

        List<UUID> messageIds = messages.stream().map(Message::getId).toList();
        String inPlaceholders = String.join(",", Collections.nCopies(messageIds.size(), "?"));
        Object[] idParams = messageIds.toArray();

        // 1. Batch fetch all status entries for these messages
        Map<UUID, Map<UUID, MessageStatusType>> statusByMessageAndUser = new HashMap<>();
        try {
            jdbcTemplate.query(
                    "SELECT message_id, user_id, status FROM message_status WHERE message_id IN (" + inPlaceholders + ")",
                    rs -> {
                        UUID msgId = UUID.fromString(rs.getString("message_id"));
                        UUID uId = UUID.fromString(rs.getString("user_id"));
                        MessageStatusType st = MessageStatusType.valueOf(rs.getString("status"));
                        statusByMessageAndUser.computeIfAbsent(msgId, k -> new HashMap<>()).put(uId, st);
                    },
                    idParams
            );
        } catch (Exception ignored) {}

        // 2. Batch fetch reactions for these messages
        Map<UUID, Map<String, List<String>>> reactionsByMessage = new HashMap<>();
        try {
            jdbcTemplate.query(
                    "SELECT mr.message_id, mr.emoji, u.username FROM message_reactions mr " +
                    "JOIN users u ON mr.user_id = u.id WHERE mr.message_id IN (" + inPlaceholders + ")",
                    rs -> {
                        UUID msgId = UUID.fromString(rs.getString("message_id"));
                        String emoji = rs.getString("emoji");
                        String username = rs.getString("username");
                        reactionsByMessage.computeIfAbsent(msgId, k -> new LinkedHashMap<>())
                                .computeIfAbsent(emoji, k -> new ArrayList<>())
                                .add(username);
                    },
                    idParams
            );
        } catch (Exception ignored) {}

        // 3. Mark unread incoming messages as READ for current user
        List<UUID> unreadIncomingIds = new ArrayList<>();
        for (Message m : messages) {
            if (!m.getSender().getId().equals(currentUserId)) {
                Map<UUID, MessageStatusType> userStatuses = statusByMessageAndUser.get(m.getId());
                if (userStatuses == null || userStatuses.get(currentUserId) != MessageStatusType.READ) {
                    unreadIncomingIds.add(m.getId());
                }
            }
        }

        if (!unreadIncomingIds.isEmpty()) {
            for (UUID msgId : unreadIncomingIds) {
                try {
                    jdbcTemplate.update("""
                        INSERT INTO message_status (id, message_id, user_id, status, updated_at)
                        VALUES (gen_random_uuid(), ?, ?, 'READ', NOW())
                        ON CONFLICT (message_id, user_id) DO UPDATE SET status = 'READ', updated_at = NOW()
                    """, msgId, currentUserId);
                } catch (Exception ignored) {}
            }
        }

        // 4. Construct DTO list with resolved statuses and reactions
        List<MessageDto> dtoList = messages.stream().map(m -> {
            MessageStatusType resolvedStatus = MessageStatusType.SENT;
            if (m.getSender().getId().equals(currentUserId)) {
                Map<UUID, MessageStatusType> userStatuses = statusByMessageAndUser.get(m.getId());
                if (userStatuses != null) {
                    boolean anyRead = userStatuses.entrySet().stream()
                            .anyMatch(e -> !e.getKey().equals(currentUserId) && e.getValue() == MessageStatusType.READ);
                    boolean anyDelivered = userStatuses.entrySet().stream()
                            .anyMatch(e -> !e.getKey().equals(currentUserId) && e.getValue() == MessageStatusType.DELIVERED);
                    if (anyRead) {
                        resolvedStatus = MessageStatusType.READ;
                    } else if (anyDelivered) {
                        resolvedStatus = MessageStatusType.DELIVERED;
                    }
                }
            } else {
                resolvedStatus = MessageStatusType.READ;
            }

            List<ReactionSummaryDto> reactionDtos = new ArrayList<>();
            Map<String, List<String>> emojiMap = reactionsByMessage.get(m.getId());
            if (emojiMap != null) {
                for (Map.Entry<String, List<String>> entry : emojiMap.entrySet()) {
                    reactionDtos.add(new ReactionSummaryDto(entry.getKey(), entry.getValue().size(), entry.getValue()));
                }
            }

            return MessageDto.fromEntity(m, resolvedStatus, reactionDtos);
        }).toList();

        return new PageImpl<>(dtoList, pageable, messagePage.getTotalElements());
    }

    @Transactional
    public MessageDto editMessage(UUID messageId, UUID currentUserId, EditMessageRequest request) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getId().equals(currentUserId)) {
            throw new UnauthorizedException("You are not authorized to edit this message");
        }

        if (message.isDeleted()) {
            throw new UnauthorizedException("Cannot edit a deleted message");
        }

        message.setContent(request.content().trim());
        message.setEdited(true);

        Message updatedMessage = messageRepository.save(message);
        return MessageDto.fromEntity(updatedMessage, MessageStatusType.SENT, List.of());
    }

    @Transactional
    public void deleteMessage(UUID messageId, UUID currentUserId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        // Validate user is either the original sender or a conversation member
        conversationService.validateMembership(message.getConversation().getId(), currentUserId);

        if (!message.getSender().getId().equals(currentUserId)) {
            throw new UnauthorizedException("You are not authorized to delete this message");
        }

        message.setDeleted(true);
        messageRepository.save(message);
    }
}
