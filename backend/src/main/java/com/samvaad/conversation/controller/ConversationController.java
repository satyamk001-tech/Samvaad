package com.samvaad.conversation.controller;

import com.samvaad.auth.security.UserPrincipal;
import com.samvaad.conversation.dto.*;
import com.samvaad.conversation.service.ConversationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping
    public ResponseEntity<List<ConversationDto>> getMyConversations(@AuthenticationPrincipal UserPrincipal principal) {
        List<ConversationDto> conversations = conversationService.getUserConversations(principal.getId());
        return ResponseEntity.ok(conversations);
    }

    @GetMapping("/requests")
    public ResponseEntity<List<ConversationDto>> getPendingRequests(@AuthenticationPrincipal UserPrincipal principal) {
        List<ConversationDto> requests = conversationService.getPendingRequests(principal.getId());
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationDto> getConversationById(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ConversationDto conversation = conversationService.getConversationById(conversationId, principal.getId());
        return ResponseEntity.ok(conversation);
    }

    @PostMapping("/direct")
    public ResponseEntity<ConversationDto> createDirectConversation(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateDirectConversationRequest request
    ) {
        ConversationDto conversation = conversationService.createOrGetDirectConversation(principal.getId(), request.recipientId());
        return ResponseEntity.status(HttpStatus.CREATED).body(conversation);
    }

    @PostMapping("/{conversationId}/accept")
    public ResponseEntity<ConversationDto> acceptRequest(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ConversationDto conversation = conversationService.acceptRequest(conversationId, principal.getId());
        return ResponseEntity.ok(conversation);
    }

    @PostMapping("/{conversationId}/reject")
    public ResponseEntity<ConversationDto> rejectRequest(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ConversationDto conversation = conversationService.rejectRequest(conversationId, principal.getId());
        return ResponseEntity.ok(conversation);
    }

    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Map<String, String>> deleteConversation(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        conversationService.deleteConversationForUser(conversationId, principal.getId());
        return ResponseEntity.ok(Map.of("message", "Conversation removed from your inbox"));
    }

    @PostMapping("/group")
    public ResponseEntity<ConversationDto> createGroupConversation(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateGroupRequest request
    ) {
        ConversationDto group = conversationService.createGroupConversation(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(group);
    }
}
