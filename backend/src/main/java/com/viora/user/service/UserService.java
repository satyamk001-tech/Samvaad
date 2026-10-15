package com.viora.user.service;

import com.viora.common.exception.ResourceNotFoundException;
import com.viora.user.dto.UpdateProfileRequest;
import com.viora.user.dto.UserDto;
import com.viora.user.entity.User;
import com.viora.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @org.springframework.beans.factory.annotation.Autowired
    public UserService(UserRepository userRepository, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public UserService(UserRepository userRepository) {
        this(userRepository, null);
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
        return UserDto.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public List<UserDto> searchUsers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return userRepository.findAll()
                    .stream()
                    .map(UserDto::fromEntity)
                    .toList();
        }
        String cleanQuery = query.trim();
        return userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(cleanQuery, cleanQuery)
                .stream()
                .map(UserDto::fromEntity)
                .toList();
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
        jdbcTemplate.update("DELETE FROM conversation_members WHERE user_id IN (SELECT id FROM users WHERE username = ?)", username);
        jdbcTemplate.update("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE username = ?)", username);
        jdbcTemplate.update("DELETE FROM calls WHERE caller_id IN (SELECT id FROM users WHERE username = ?) OR receiver_id IN (SELECT id FROM users WHERE username = ?)", username, username);
        jdbcTemplate.update("DELETE FROM message_status WHERE user_id IN (SELECT id FROM users WHERE username = ?)", username);
        jdbcTemplate.update("DELETE FROM messages WHERE sender_id IN (SELECT id FROM users WHERE username = ?)", username);
        jdbcTemplate.update("DELETE FROM users WHERE username = ?", username);
    }
}
