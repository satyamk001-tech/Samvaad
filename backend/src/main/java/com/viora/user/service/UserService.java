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

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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

        User updatedUser = userRepository.save(user);
        return UserDto.fromEntity(updatedUser);
    }
}
