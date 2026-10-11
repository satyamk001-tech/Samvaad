package com.viora.messaging.service;

import com.viora.common.exception.ResourceNotFoundException;
import com.viora.common.exception.UnauthorizedException;
import com.viora.conversation.service.ConversationService;
import com.viora.messaging.dto.EditMessageRequest;
import com.viora.messaging.dto.MessageDto;
import com.viora.messaging.entity.Message;
import com.viora.messaging.repository.MessageRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationService conversationService;

    public MessageService(
            MessageRepository messageRepository,
            ConversationService conversationService
    ) {
        this.messageRepository = messageRepository;
        this.conversationService = conversationService;
    }

    @Transactional(readOnly = true)
    public Page<MessageDto> getConversationMessages(UUID conversationId, UUID currentUserId, int page, int size) {
        // Enforce security check: User MUST be an active member of conversation
        conversationService.validateMembership(conversationId, currentUserId);

        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);

        return messages.map(MessageDto::fromEntity);
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
        return MessageDto.fromEntity(updatedMessage);
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
