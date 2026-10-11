package com.viora.attachment.service;

import com.viora.attachment.dto.AttachmentDto;
import com.viora.attachment.entity.Attachment;
import com.viora.attachment.repository.AttachmentRepository;
import com.viora.common.exception.BadRequestException;
import com.viora.common.exception.ResourceNotFoundException;
import com.viora.common.exception.UnauthorizedException;
import com.viora.conversation.entity.Conversation;
import com.viora.conversation.entity.ConversationType;
import com.viora.conversation.service.ConversationService;
import com.viora.messaging.entity.Message;
import com.viora.messaging.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AttachmentService Tests")
class AttachmentServiceTest {

    @Mock
    private AttachmentRepository attachmentRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private ConversationService conversationService;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private AttachmentService attachmentService;

    private UUID userId;
    private UUID conversationId;
    private UUID messageId;
    private Conversation conversation;
    private Message message;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        conversationId = UUID.randomUUID();
        messageId = UUID.randomUUID();

        conversation = Conversation.builder()
                .type(ConversationType.DIRECT)
                .build();
        conversation.setId(conversationId);

        message = Message.builder()
                .conversation(conversation)
                .content("File attached")
                .build();
        message.setId(messageId);
    }

    @Test
    @DisplayName("uploadAttachment succeeds for valid PDF and creates Attachment record")
    void uploadAttachment_success() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "document.pdf", "application/pdf", "dummy pdf content".getBytes()
        );

        when(messageRepository.findById(messageId)).thenReturn(Optional.of(message));
        doNothing().when(conversationService).validateMembership(conversationId, userId);
        when(storageService.store(eq(file), anyString())).thenReturn("conversations/key/document.pdf");

        Attachment savedAttachment = Attachment.builder()
                .message(message)
                .fileName("document.pdf")
                .fileType("PDF")
                .fileSize(file.getSize())
                .storageKey("conversations/key/document.pdf")
                .contentType("application/pdf")
                .build();
        savedAttachment.setId(UUID.randomUUID());

        when(attachmentRepository.save(any(Attachment.class))).thenReturn(savedAttachment);

        AttachmentDto result = attachmentService.uploadAttachment(messageId, userId, file);

        assertThat(result).isNotNull();
        assertThat(result.fileName()).isEqualTo("document.pdf");
        assertThat(result.fileType()).isEqualTo("PDF");
        verify(storageService).store(eq(file), anyString());
        verify(attachmentRepository).save(any(Attachment.class));
    }

    @Test
    @DisplayName("uploadAttachment rejects file when size exceeds 25MB limit")
    void uploadAttachment_exceedsMaxSize_throwsBadRequest() {
        byte[] oversizedBytes = new byte[100];
        MockMultipartFile file = new MockMultipartFile("file", "huge.pdf", "application/pdf", oversizedBytes) {
            @Override
            public long getSize() {
                return AttachmentService.MAX_FILE_SIZE_BYTES + 1;
            }
        };

        assertThatThrownBy(() -> attachmentService.uploadAttachment(messageId, userId, file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File size exceeds maximum permitted limit");

        verifyNoInteractions(storageService);
        verifyNoInteractions(attachmentRepository);
    }

    @Test
    @DisplayName("uploadAttachment rejects disallowed MIME type executable")
    void uploadAttachment_disallowedMimeType_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "malware.exe", "application/x-msdownload", "malicious content".getBytes()
        );

        assertThatThrownBy(() -> attachmentService.uploadAttachment(messageId, userId, file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File type not permitted");

        verifyNoInteractions(storageService);
        verifyNoInteractions(attachmentRepository);
    }

    @Test
    @DisplayName("uploadAttachment rejects empty file")
    void uploadAttachment_emptyFile_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.txt", "text/plain", new byte[0]
        );

        assertThatThrownBy(() -> attachmentService.uploadAttachment(messageId, userId, file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot upload an empty file");

        verifyNoInteractions(storageService);
    }

    @Test
    @DisplayName("downloadAttachment succeeds for active conversation member")
    void downloadAttachment_success() {
        UUID attachmentId = UUID.randomUUID();
        Attachment attachment = Attachment.builder()
                .message(message)
                .fileName("receipt.pdf")
                .storageKey("key/receipt.pdf")
                .build();
        attachment.setId(attachmentId);

        when(attachmentRepository.findById(attachmentId)).thenReturn(Optional.of(attachment));
        doNothing().when(conversationService).validateMembership(conversationId, userId);
        Resource mockResource = new ByteArrayResource("content".getBytes());
        when(storageService.loadAsResource("key/receipt.pdf")).thenReturn(mockResource);

        Resource result = attachmentService.downloadAttachment(attachmentId, userId);

        assertThat(result).isNotNull();
        verify(conversationService).validateMembership(conversationId, userId);
        verify(storageService).loadAsResource("key/receipt.pdf");
    }

    @Test
    @DisplayName("downloadAttachment throws UnauthorizedException when user is not member of conversation")
    void downloadAttachment_nonMember_throwsUnauthorized() {
        UUID attachmentId = UUID.randomUUID();
        Attachment attachment = Attachment.builder()
                .message(message)
                .storageKey("key/receipt.pdf")
                .build();
        attachment.setId(attachmentId);

        when(attachmentRepository.findById(attachmentId)).thenReturn(Optional.of(attachment));
        doThrow(new UnauthorizedException("User is not an active member"))
                .when(conversationService).validateMembership(conversationId, userId);

        assertThatThrownBy(() -> attachmentService.downloadAttachment(attachmentId, userId))
                .isInstanceOf(UnauthorizedException.class);

        verifyNoInteractions(storageService);
    }
}
