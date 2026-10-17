package com.samvaad.attachment.service;

import com.samvaad.attachment.dto.AttachmentDto;
import com.samvaad.attachment.entity.Attachment;
import com.samvaad.attachment.repository.AttachmentRepository;
import com.samvaad.common.exception.BadRequestException;
import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.conversation.entity.Conversation;
import com.samvaad.conversation.repository.ConversationRepository;
import com.samvaad.conversation.service.ConversationService;
import com.samvaad.messaging.dto.MessageDto;
import com.samvaad.messaging.dto.StompEventPayload;
import com.samvaad.messaging.entity.Message;
import com.samvaad.messaging.entity.MessageType;
import com.samvaad.messaging.repository.MessageRepository;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class AttachmentService {

    // Maximum 500 MB per file
    public static final long MAX_FILE_SIZE_BYTES = 500L * 1024 * 1024;

    // Supported MIME types for communication
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            // Images
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
            // Audio
            "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
            // Video
            "video/mp4", "video/webm", "video/ogg",
            // Documents
            "application/pdf", "application/zip", "application/x-zip-compressed",
            "text/plain", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final AttachmentRepository attachmentRepository;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final ConversationService conversationService;
    private final StorageService storageService;
    private final SimpMessagingTemplate messagingTemplate;

    public AttachmentService(
            AttachmentRepository attachmentRepository,
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            UserRepository userRepository,
            ConversationService conversationService,
            StorageService storageService,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.attachmentRepository = attachmentRepository;
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.conversationService = conversationService;
        this.storageService = storageService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public AttachmentDto uploadAttachment(UUID messageId, UUID currentUserId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Cannot upload an empty file");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File size exceeds maximum permitted limit of 25MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("File type not permitted: " + contentType);
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found: " + messageId));

        // Enforce conversation membership
        conversationService.validateMembership(message.getConversation().getId(), currentUserId);

        // Store file on underlying storage
        String subPath = "conversations/" + message.getConversation().getId() + "/messages/" + messageId;
        String storageKey;
        try {
            storageKey = storageService.store(file, subPath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to persist uploaded attachment", e);
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String fileType = extractFileType(contentType);

        Attachment attachment = Attachment.builder()
                .message(message)
                .fileName(originalFilename)
                .fileType(fileType)
                .fileSize(file.getSize())
                .storageKey(storageKey)
                .contentType(contentType)
                .build();

        Attachment savedAttachment = attachmentRepository.save(attachment);
        return AttachmentDto.fromEntity(savedAttachment);
    }

    @Transactional
    public AttachmentDto uploadAttachmentToConversation(UUID conversationId, UUID currentUserId, MultipartFile file) {
        return uploadAttachmentToConversation(conversationId, currentUserId, file, null);
    }

    @Transactional
    public AttachmentDto uploadAttachmentToConversation(UUID conversationId, UUID currentUserId, MultipartFile file, String requestedType) {
        if (file.isEmpty()) {
            throw new BadRequestException("Cannot upload an empty file");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("File size exceeds maximum permitted limit of 500MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found: " + conversationId));

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUserId));

        conversationService.validateMembership(conversationId, currentUserId);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String fileType = extractFileType(contentType);

        MessageType messageType;
        if ("VOICE_NOTE".equalsIgnoreCase(requestedType)) {
            messageType = MessageType.VOICE_NOTE;
        } else if ("IMAGE".equalsIgnoreCase(requestedType) || "IMAGE".equals(fileType)) {
            messageType = MessageType.IMAGE;
        } else {
            messageType = MessageType.DOCUMENT;
        }

        Message message = Message.builder()
                .conversation(conversation)
                .sender(user)
                .content(originalFilename)
                .type(messageType)
                .isEdited(false)
                .isDeleted(false)
                .build();

        Message savedMessage = messageRepository.save(message);

        String subPath = "conversations/" + conversationId + "/messages/" + savedMessage.getId();
        String storageKey;
        try {
            storageKey = storageService.store(file, subPath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to persist uploaded attachment", e);
        }

        Attachment attachment = Attachment.builder()
                .message(savedMessage)
                .fileName(originalFilename)
                .fileType(fileType)
                .fileSize(file.getSize())
                .storageKey(storageKey)
                .contentType(contentType)
                .build();

        Attachment savedAttachment = attachmentRepository.save(attachment);
        AttachmentDto attachmentDto = AttachmentDto.fromEntity(savedAttachment);

        // Broadcast message to conversation topic
        MessageDto messageDto = MessageDto.fromEntity(savedMessage);
        messagingTemplate.convertAndSend(
                "/topic/conversations." + conversationId,
                StompEventPayload.of("NEW_MESSAGE", messageDto)
        );

        return attachmentDto;
    }

    @Transactional(readOnly = true)
    public Resource downloadAttachment(UUID attachmentId, UUID currentUserId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));

        // Validate that user is a member of the conversation containing this attachment
        conversationService.validateMembership(attachment.getMessage().getConversation().getId(), currentUserId);

        return storageService.loadAsResource(attachment.getStorageKey());
    }

    @Transactional(readOnly = true)
    public Attachment getAttachmentMetadata(UUID attachmentId, UUID currentUserId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));

        conversationService.validateMembership(attachment.getMessage().getConversation().getId(), currentUserId);
        return attachment;
    }

    @Transactional(readOnly = true)
    public List<AttachmentDto> getMessageAttachments(UUID messageId, UUID currentUserId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found: " + messageId));

        conversationService.validateMembership(message.getConversation().getId(), currentUserId);

        return attachmentRepository.findByMessageId(messageId)
                .stream()
                .map(AttachmentDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Attachment getPrimaryMessageAttachment(UUID messageId, UUID currentUserId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found: " + messageId));

        conversationService.validateMembership(message.getConversation().getId(), currentUserId);

        List<Attachment> list = attachmentRepository.findByMessageId(messageId);
        if (list.isEmpty()) {
            throw new ResourceNotFoundException("No attachment found for message: " + messageId);
        }
        return list.get(0);
    }

    public Resource loadAttachmentResource(Attachment attachment) {
        return storageService.loadAsResource(attachment.getStorageKey());
    }

    private String extractFileType(String contentType) {
        if (contentType.startsWith("image/")) return "IMAGE";
        if (contentType.startsWith("audio/")) return "AUDIO";
        if (contentType.startsWith("video/")) return "VIDEO";
        if (contentType.equals("application/pdf")) return "PDF";
        return "DOCUMENT";
    }
}
