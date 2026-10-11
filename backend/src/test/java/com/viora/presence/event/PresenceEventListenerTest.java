package com.viora.presence.event;

import com.viora.auth.security.UserPrincipal;
import com.viora.presence.service.PresenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PresenceEventListener Tests")
class PresenceEventListenerTest {

    @Mock
    private PresenceService presenceService;

    @InjectMocks
    private PresenceEventListener presenceEventListener;

    private UUID userId;
    private UserPrincipal userPrincipal;
    private UsernamePasswordAuthenticationToken auth;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        userPrincipal = new UserPrincipal(
                userId, "alice", "alice@viora.io", "pass",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        auth = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
    }

    @Test
    @DisplayName("handleSessionConnected triggers markOnline on PresenceService")
    void handleSessionConnected_callsMarkOnline() {
        // Arrange
        SessionConnectedEvent event = new SessionConnectedEvent(this, MessageBuilder.withPayload(new byte[0]).build(), auth);

        // Act
        presenceEventListener.handleSessionConnected(event);

        // Assert
        verify(presenceService).markOnline(userId, "alice");
    }

    @Test
    @DisplayName("handleSessionDisconnect triggers markOffline on PresenceService")
    void handleSessionDisconnect_callsMarkOffline() {
        // Arrange
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setUser(auth);
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        SessionDisconnectEvent event = new SessionDisconnectEvent(this, message, "sess-01", CloseStatus.NORMAL);

        // Act
        presenceEventListener.handleSessionDisconnect(event);

        // Assert
        verify(presenceService).markOffline(userId, "alice");
    }

    @Test
    @DisplayName("handleSessionConnected with null user does nothing")
    void handleSessionConnected_nullUser_doesNothing() {
        // Arrange
        SessionConnectedEvent event = new SessionConnectedEvent(this, MessageBuilder.withPayload(new byte[0]).build(), null);

        // Act
        presenceEventListener.handleSessionConnected(event);

        // Assert
        verifyNoInteractions(presenceService);
    }
}
