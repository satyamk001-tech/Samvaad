package com.samvaad.signaling.controller;

import com.samvaad.auth.security.UserPrincipal;
import com.samvaad.signaling.dto.SignalingMessage;
import com.samvaad.signaling.service.SignalingService;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class SignalingStompController {

    private final SignalingService signalingService;

    public SignalingStompController(SignalingService signalingService) {
        this.signalingService = signalingService;
    }

    @MessageMapping("/call.signal")
    public void handleSignal(@Valid @Payload SignalingMessage message, Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            signalingService.processSignalingMessage(userPrincipal.getId(), message);
            return;
        }
        throw new IllegalArgumentException("Unauthenticated signaling request");
    }
}
