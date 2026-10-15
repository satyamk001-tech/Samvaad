package com.samvaad.messaging.config;

import com.samvaad.auth.security.JwtTokenProvider;
import com.samvaad.auth.security.UserPrincipal;
import com.samvaad.common.exception.UnauthorizedException;
import com.samvaad.conversation.service.ConversationService;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WebSocketSecurityInterceptor Tests")
class WebSocketSecurityInterceptorTest {

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConversationService conversationService;

    @Mock
    private MessageChannel channel;

    @InjectMocks
    private WebSocketSecurityInterceptor interceptor;

    private UUID userId;
    private User user;
    private String validToken;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        user.setUsername("testuser");
        user.setEmail("test@samvaad.gov.in");
        user.setPasswordHash("hashed");
        validToken = "valid.jwt.token";
    }

    // =========================================================
    // CONNECT command tests
    // =========================================================

    @Test
    @DisplayName("CONNECT with valid Bearer JWT sets user principal on accessor")
    void connect_validBearerJwt_setsUserPrincipal() {
        // Arrange
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer " + validToken);
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(tokenProvider.validateToken(validToken)).thenReturn(true);
        when(tokenProvider.getUserIdFromToken(validToken)).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        Message<?> result = interceptor.preSend(message, channel);

        // Assert
        assertThat(result).isNotNull();
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertThat(resultAccessor.getUser()).isNotNull();
        assertThat(resultAccessor.getUser()).isInstanceOf(UsernamePasswordAuthenticationToken.class);

        UsernamePasswordAuthenticationToken auth =
                (UsernamePasswordAuthenticationToken) resultAccessor.getUser();
        assertThat(auth.getPrincipal()).isInstanceOf(UserPrincipal.class);
        assertThat(((UserPrincipal) auth.getPrincipal()).getUsername()).isEqualTo("testuser");

        verify(tokenProvider).validateToken(validToken);
        verify(tokenProvider).getUserIdFromToken(validToken);
        verify(userRepository).findById(userId);
    }

    @Test
    @DisplayName("CONNECT with valid passcode header (no Bearer) sets user principal")
    void connect_validPasscodeHeader_setsUserPrincipal() {
        // Arrange
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("passcode", validToken);
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(tokenProvider.validateToken(validToken)).thenReturn(true);
        when(tokenProvider.getUserIdFromToken(validToken)).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        Message<?> result = interceptor.preSend(message, channel);

        // Assert
        assertThat(result).isNotNull();
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertThat(resultAccessor.getUser()).isNotNull();
    }

    @Test
    @DisplayName("CONNECT with missing Authorization header throws IllegalArgumentException")
    void connect_missingToken_throwsIllegalArgumentException() {
        // Arrange
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // Act & Assert
        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid or missing JWT authentication token");

        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("CONNECT with invalid JWT token throws IllegalArgumentException")
    void connect_invalidToken_throwsIllegalArgumentException() {
        // Arrange
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer invalid.token");
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(tokenProvider.validateToken("invalid.token")).thenReturn(false);

        // Act & Assert
        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid or missing JWT authentication token");

        verify(tokenProvider).validateToken("invalid.token");
        verifyNoInteractions(userRepository);
    }

    // =========================================================
    // SUBSCRIBE command tests
    // =========================================================

    @Test
    @DisplayName("SUBSCRIBE to /topic/conversations.<id> with valid membership passes silently")
    void subscribe_validConversationMember_passes() {
        // Arrange
        UUID conversationId = UUID.randomUUID();
        UserPrincipal principal = new UserPrincipal(
                userId, "testuser", "test@samvaad.gov.in", "hash",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setUser(auth);
        accessor.setDestination("/topic/conversations." + conversationId);
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        doNothing().when(conversationService).validateMembership(conversationId, userId);

        // Act
        Message<?> result = interceptor.preSend(message, channel);

        // Assert
        assertThat(result).isNotNull();
        verify(conversationService).validateMembership(conversationId, userId);
    }

    @Test
    @DisplayName("SUBSCRIBE to /topic/conversations.<id> with non-member throws UnauthorizedException")
    void subscribe_nonMember_throwsUnauthorizedException() {
        // Arrange
        UUID conversationId = UUID.randomUUID();
        UserPrincipal principal = new UserPrincipal(
                userId, "testuser", "test@samvaad.gov.in", "hash",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setUser(auth);
        accessor.setDestination("/topic/conversations." + conversationId);
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        doThrow(new UnauthorizedException("User is not an active member of this conversation"))
                .when(conversationService).validateMembership(conversationId, userId);

        // Act & Assert
        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("not an active member");

        verify(conversationService).validateMembership(conversationId, userId);
    }

    @Test
    @DisplayName("SUBSCRIBE without authenticated user throws IllegalArgumentException")
    void subscribe_unauthenticatedUser_throwsIllegalArgumentException() {
        // Arrange
        UUID conversationId = UUID.randomUUID();
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/conversations." + conversationId);
        accessor.setLeaveMutable(true);
        // No user set on accessor

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // Act & Assert
        assertThatThrownBy(() -> interceptor.preSend(message, channel))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unauthenticated user");

        verifyNoInteractions(conversationService);
    }

    @Test
    @DisplayName("SUBSCRIBE to non-conversation topic (e.g., /topic/presence) passes without membership check")
    void subscribe_nonConversationDestination_passesWithoutCheck() {
        // Arrange
        UserPrincipal principal = new UserPrincipal(
                userId, "testuser", "test@samvaad.gov.in", "hash",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setUser(auth);
        accessor.setDestination("/topic/presence");
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // Act
        Message<?> result = interceptor.preSend(message, channel);

        // Assert
        assertThat(result).isNotNull();
        verifyNoInteractions(conversationService);
    }

    @Test
    @DisplayName("Non-CONNECT, non-SUBSCRIBE messages pass through unmodified")
    void send_commandPassesThroughUnmodified() {
        // Arrange
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setLeaveMutable(true);

        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        // Act
        Message<?> result = interceptor.preSend(message, channel);

        // Assert
        assertThat(result).isSameAs(message);
        verifyNoInteractions(tokenProvider, userRepository, conversationService);
    }
}
