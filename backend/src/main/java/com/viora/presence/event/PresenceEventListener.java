package com.viora.presence.event;

import com.viora.auth.security.UserPrincipal;
import com.viora.presence.service.PresenceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

/**
 * Listens to Spring WebSocket session lifecycle events and delegates
 * presence state changes to {@link PresenceService}.
 *
 * <ul>
 *   <li>{@link SessionConnectedEvent} — fired after the STOMP CONNECTED frame is sent;
 *       the Principal is already set by {@code WebSocketSecurityInterceptor}.</li>
 *   <li>{@link SessionDisconnectEvent} — fired when the WebSocket session closes,
 *       whether by client request or network loss.</li>
 * </ul>
 */
@Component
public class PresenceEventListener {

    private static final Logger log = LoggerFactory.getLogger(PresenceEventListener.class);

    private final PresenceService presenceService;

    public PresenceEventListener(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        UserPrincipal principal = extractPrincipal(event.getUser());
        if (principal != null) {
            presenceService.markOnline(principal.getId(), principal.getUsername());
            log.info("STOMP CONNECTED: user={}", principal.getUsername());
        }
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        UserPrincipal principal = extractPrincipal(accessor.getUser());
        if (principal != null) {
            presenceService.markOffline(principal.getId(), principal.getUsername());
            log.info("STOMP DISCONNECTED: user={}", principal.getUsername());
        }
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private UserPrincipal extractPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal up) {
            return up;
        }
        return null;
    }
}
