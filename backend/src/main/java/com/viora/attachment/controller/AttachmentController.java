package com.viora.attachment.controller;

import com.viora.attachment.dto.AttachmentDto;
import com.viora.attachment.entity.Attachment;
import com.viora.attachment.service.AttachmentService;
import com.viora.auth.security.UserPrincipal;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping("/conversations/{conversationId}")
    public ResponseEntity<AttachmentDto> uploadAttachmentToConversation(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) {
        AttachmentDto attachment = attachmentService.uploadAttachmentToConversation(conversationId, principal.getId(), file);
        return ResponseEntity.ok(attachment);
    }

    @PostMapping("/messages/{messageId}")
    public ResponseEntity<AttachmentDto> uploadAttachment(
            @PathVariable UUID messageId,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) {
        AttachmentDto attachment = attachmentService.uploadAttachment(messageId, principal.getId(), file);
        return ResponseEntity.ok(attachment);
    }

    @GetMapping("/messages/{messageId}")
    public ResponseEntity<List<AttachmentDto>> getMessageAttachments(
            @PathVariable UUID messageId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<AttachmentDto> attachments = attachmentService.getMessageAttachments(messageId, principal.getId());
        return ResponseEntity.ok(attachments);
    }

    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Attachment metadata = attachmentService.getAttachmentMetadata(attachmentId, principal.getId());
        Resource resource = attachmentService.downloadAttachment(attachmentId, principal.getId());

        String encodedFileName = URLEncoder.encode(metadata.getFileName(), StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"")
                .body(resource);
    }
}
