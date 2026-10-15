package com.samvaad.attachment.dto;

import com.samvaad.attachment.entity.Attachment;

import java.time.Instant;
import java.util.UUID;

public record AttachmentDto(
        UUID id,
        UUID messageId,
        String fileName,
        String fileType,
        long fileSize,
        String contentType,
        String downloadUrl,
        Instant createdAt
) {
    public static AttachmentDto fromEntity(Attachment attachment) {
        return new AttachmentDto(
                attachment.getId(),
                attachment.getMessage().getId(),
                attachment.getFileName(),
                attachment.getFileType(),
                attachment.getFileSize(),
                attachment.getContentType(),
                "/api/v1/attachments/" + attachment.getId() + "/download",
                attachment.getCreatedAt()
        );
    }
}
