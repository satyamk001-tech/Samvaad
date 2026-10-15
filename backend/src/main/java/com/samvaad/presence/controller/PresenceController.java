package com.samvaad.presence.controller;

import com.samvaad.auth.security.UserPrincipal;
import com.samvaad.presence.service.PresenceService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * STOMP controller for presence-related frames from the client.
 *
 * <p>Clients must periodically send a heartbeat frame to keep their
 * Redis presence key alive and avoid being marked offline by TTL expiry.</p>
 *
 * <pre>
 * Client → SEND /app/presence.heartbeat  (no body required)
 * </pre>
 */
@Controller
public class PresenceController {

    private final PresenceService presenceService;

    public PresenceController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    /**
     * Receives a heartbeat frame and refreshes the sender's Redis TTL,
     * preventing automatic offline marking due to key expiry.
     *
     * @param principal the authenticated STOMP user (set by WebSocketSecurityInterceptor)
     */
    @MessageMapping("/presence.heartbeat")
    public void heartbeat(Principal principal) {
        UserPrincipal user = extractPrincipal(principal);
        if (user != null) {
            presenceService.refreshHeartbeat(user.getId());
        }
    }

    private UserPrincipal extractPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal up) {
            return up;
        }
        return null;
    }
}
