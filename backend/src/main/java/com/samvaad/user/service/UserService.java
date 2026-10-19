package com.samvaad.user.service;

import com.samvaad.common.exception.BadRequestException;
import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.user.dto.UpdateProfileRequest;
import com.samvaad.user.dto.UserDto;
import com.samvaad.user.entity.User;
import com.samvaad.user.entity.UserBlock;
import com.samvaad.user.repository.UserBlockRepository;
import com.samvaad.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public UserService(
            UserRepository userRepository,
            UserBlockRepository userBlockRepository,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate
    ) {
        this.userRepository = userRepository;
        this.userBlockRepository = userBlockRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
        return UserDto.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public List<UserDto> searchUsers(String query) {
        if (query == null) {
            return Collections.emptyList();
        }
        String clean = query.trim();
        if (clean.startsWith("@")) {
            clean = clean.substring(1).trim();
        }
        if (clean.isEmpty()) {
            return Collections.emptyList();
        }
        // Strict exact username lookup (case-insensitive) - no substring/display name enumeration
        return userRepository.findByUsernameIgnoreCase(clean)
                .map(UserDto::fromEntity)
                .map(List::of)
                .orElse(Collections.emptyList());
    }

    @Transactional
    public void blockUser(UUID blockerId, UUID blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new BadRequestException("You cannot block yourself");
        }
        User blocker = userRepository.findById(blockerId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
        User blocked = userRepository.findById(blockedId)
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        if (!userBlockRepository.isBlocked(blockerId, blockedId)) {
            userBlockRepository.save(new UserBlock(blocker, blocked));
        }
    }

    @Transactional
    public void unblockUser(UUID blockerId, UUID blockedId) {
        userBlockRepository.findByBlockerIdAndBlockedId(blockerId, blockedId)
                .ifPresent(userBlockRepository::delete);
    }

    @Transactional(readOnly = true)
    public List<UserDto> getBlockedUsers(UUID blockerId) {
        return userBlockRepository.findByBlockerId(blockerId)
                .stream()
                .map(ub -> UserDto.fromEntity(ub.getBlocked()))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isBlocked(UUID userA, UUID userB) {
        return userBlockRepository.isBlockedEitherWay(userA, userB);
    }

    @Transactional
    public UserDto updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (request.displayName() != null && !request.displayName().isBlank()) {
            user.setDisplayName(request.displayName().trim());
        }
        if (request.bio() != null) {
            user.setBio(request.bio().trim());
        }
        if (request.avatarUrl() != null) {
            user.setAvatarUrl(request.avatarUrl().trim());
        }
        if (request.statusMessage() != null) {
            user.setStatusMessage(request.statusMessage().trim());
        }
        if (request.languagePreference() != null && !request.languagePreference().isBlank()) {
            user.setLanguagePreference(request.languagePreference().trim());
        }

        User updatedUser = userRepository.save(user);
        return UserDto.fromEntity(updatedUser);
    }

    @Transactional
    public void deleteUserByUsername(String username) {
        if (jdbcTemplate != null) {
            jdbcTemplate.update("DELETE FROM conversation_members WHERE user_id IN (SELECT id FROM users WHERE username = ?)", username);
            jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username = ?)", username);
            jdbcTemplate.update("DELETE FROM calls WHERE caller_id IN (SELECT id FROM users WHERE username = ?) OR receiver_id IN (SELECT id FROM users WHERE username = ?)", username, username);
            jdbcTemplate.update("DELETE FROM message_status WHERE user_id IN (SELECT id FROM users WHERE username = ?)", username);
            jdbcTemplate.update("DELETE FROM messages WHERE sender_id IN (SELECT id FROM users WHERE username = ?)", username);
            jdbcTemplate.update("DELETE FROM user_blocks WHERE blocker_id IN (SELECT id FROM users WHERE username = ?) OR blocked_id IN (SELECT id FROM users WHERE username = ?)", username, username);
            jdbcTemplate.update("DELETE FROM user_deleted_conversations WHERE user_id IN (SELECT id FROM users WHERE username = ?)", username);
            jdbcTemplate.update("DELETE FROM users WHERE username = ?", username);
        }
    }

    @Transactional
    public void deleteUserById(UUID userId) {
        if (jdbcTemplate != null) {
            jdbcTemplate.update("DELETE FROM conversation_members WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM calls WHERE caller_id = ? OR receiver_id = ?", userId, userId);
            jdbcTemplate.update("DELETE FROM message_status WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM messages WHERE sender_id = ?", userId);
            jdbcTemplate.update("DELETE FROM user_pinned_conversations WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM user_starred_messages WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM sovereign_vault_docs WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?", userId, userId);
            jdbcTemplate.update("DELETE FROM user_deleted_conversations WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId);
        }
    }
}
