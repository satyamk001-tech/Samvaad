package com.viora.messaging.controller;

import com.viora.auth.security.UserPrincipal;
import com.viora.messaging.dto.EditMessageRequest;
import com.viora.messaging.dto.MessageDto;
import com.viora.messaging.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<Page<MessageDto>> getMessages(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Page<MessageDto> messages = messageService.getConversationMessages(conversationId, principal.getId(), page, size);
        return ResponseEntity.ok(messages);
    }

    @PutMapping("/messages/{messageId}")
    public ResponseEntity<MessageDto> editMessage(
            @PathVariable UUID messageId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody EditMessageRequest request
    ) {
        MessageDto updatedMessage = messageService.editMessage(messageId, principal.getId(), request);
        return ResponseEntity.ok(updatedMessage);
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Map<String, String>> deleteMessage(
            @PathVariable UUID messageId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        messageService.deleteMessage(messageId, principal.getId());
        return ResponseEntity.ok(Map.of("message", "Message deleted successfully"));
    }
}
