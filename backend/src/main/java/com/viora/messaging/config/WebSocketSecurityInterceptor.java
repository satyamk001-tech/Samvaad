package com.viora.messaging.config;

import com.viora.auth.security.JwtTokenProvider;
import com.viora.auth.security.UserPrincipal;
import com.viora.conversation.service.ConversationService;
import com.viora.user.repository.UserRepository;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@Component
public class WebSocketSecurityInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final ConversationService conversationService;

    public WebSocketSecurityInterceptor(
            JwtTokenProvider tokenProvider,
            UserRepository userRepository,
            ConversationService conversationService
    ) {
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
        this.conversationService = conversationService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null) {
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                handleConnect(accessor);
            } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                handleSubscribe(accessor);
            }
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);

        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            UUID userId = tokenProvider.getUserIdFromToken(token);
            userRepository.findById(userId).ifPresent(user -> {
                UserPrincipal principal = UserPrincipal.create(user);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        principal, null, principal.getAuthorities()
                );
                accessor.setUser(auth);
            });
        } else {
            throw new IllegalArgumentException("STOMP connection failed: Invalid or missing JWT authentication token");
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        Principal userPrincipal = accessor.getUser();
        if (userPrincipal == null) {
            throw new IllegalArgumentException("STOMP subscription failed: Unauthenticated user");
        }

        String destination = accessor.getDestination();
        if (destination != null && destination.startsWith("/topic/conversations.")) {
            String conversationIdStr = destination.substring("/topic/conversations.".length());
            try {
                UUID conversationId = UUID.fromString(conversationIdStr);
                UserPrincipal principal = extractUserPrincipal(userPrincipal);
                conversationService.validateMembership(conversationId, principal.getId());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("STOMP subscription failed: Invalid conversation ID destination");
            }
        }
    }

    private String extractToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String bearer = authHeaders.get(0);
            if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
                return bearer.substring(7);
            }
        }

        List<String> passcodeHeaders = accessor.getNativeHeader("passcode");
        if (passcodeHeaders != null && !passcodeHeaders.isEmpty()) {
            return passcodeHeaders.get(0);
        }

        return null;
    }

    private UserPrincipal extractUserPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            if (auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
                return userPrincipal;
            }
        }
        throw new IllegalArgumentException("Invalid authentication principal");
    }
}
