package com.viora.messaging.controller;

import com.viora.auth.security.UserPrincipal;
import com.viora.conversation.service.ConversationService;
import com.viora.messaging.dto.*;
import com.viora.messaging.service.StompMessagingService;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class StompMessageController {

    private final StompMessagingService stompMessagingService;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    public StompMessageController(
            StompMessagingService stompMessagingService,
            ConversationService conversationService,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.stompMessagingService = stompMessagingService;
        this.conversationService = conversationService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Valid @Payload StompSendMessagePayload payload, Principal principal) {
        UserPrincipal userPrincipal = extractUserPrincipal(principal);
        stompMessagingService.processIncomingMessage(userPrincipal.getId(), payload);
    }

    @MessageMapping("/chat.typing")
    public void handleTyping(@Valid @Payload StompTypingPayload payload, Principal principal) {
        UserPrincipal userPrincipal = extractUserPrincipal(principal);
        // Ensure user is an active member of this conversation
        conversationService.validateMembership(payload.conversationId(), userPrincipal.getId());

        // Ephemeral broadcast to the conversation topic
        StompTypingEventPayload eventData = new StompTypingEventPayload(
                userPrincipal.getId(),
                userPrincipal.getUsername(),
                payload.isTyping()
        );

        messagingTemplate.convertAndSend(
                "/topic/conversations." + payload.conversationId(),
                StompEventPayload.of("TYPING", eventData)
        );
    }

    @MessageMapping("/chat.delivered")
    public void handleDelivered(@Valid @Payload StompReceiptPayload payload, Principal principal) {
        UserPrincipal userPrincipal = extractUserPrincipal(principal);
        stompMessagingService.markDelivered(userPrincipal.getId(), payload);
    }

    @MessageMapping("/chat.read")
    public void handleRead(@Valid @Payload StompReceiptPayload payload, Principal principal) {
        UserPrincipal userPrincipal = extractUserPrincipal(principal);
        stompMessagingService.markRead(userPrincipal.getId(), payload);
    }

    private UserPrincipal extractUserPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            if (auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
                return userPrincipal;
            }
        }
        throw new IllegalArgumentException("Unauthenticated STOMP message request");
    }
}
