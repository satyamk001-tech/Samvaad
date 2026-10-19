package com.samvaad.user.controller;

import com.samvaad.auth.security.UserPrincipal;
import com.samvaad.user.dto.UpdateProfileRequest;
import com.samvaad.user.dto.UserDto;
import com.samvaad.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final com.samvaad.user.security.SearchRateLimiter searchRateLimiter;

    public UserController(UserService userService, com.samvaad.user.security.SearchRateLimiter searchRateLimiter) {
        this.userService = userService;
        this.searchRateLimiter = searchRateLimiter;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMyProfile(@AuthenticationPrincipal UserPrincipal principal) {
        UserDto currentUser = userService.getUserById(principal.getId());
        return ResponseEntity.ok(currentUser);
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UserDto updatedUser = userService.updateProfile(principal.getId(), request);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyAccount(@AuthenticationPrincipal UserPrincipal principal) {
        userService.deleteUserById(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "q", required = false) String q,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal != null && !searchRateLimiter.tryAcquire(principal.getId())) {
            throw new com.samvaad.common.exception.RateLimitExceededException("Too many search requests. Please wait a moment before trying again.");
        }
        String effectiveQuery = (query != null && !query.isBlank()) ? query : q;
        List<UserDto> users = userService.searchUsers(effectiveQuery)
                .stream()
                .filter(u -> principal == null || !u.id().equals(principal.getId()))
                .map(UserDto::toPublicDto)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/{userId}/block")
    public ResponseEntity<Map<String, String>> blockUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        userService.blockUser(principal.getId(), userId);
        return ResponseEntity.ok(Map.of("message", "User blocked successfully"));
    }

    @DeleteMapping("/{userId}/block")
    public ResponseEntity<Map<String, String>> unblockUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        userService.unblockUser(principal.getId(), userId);
        return ResponseEntity.ok(Map.of("message", "User unblocked successfully"));
    }

    @GetMapping("/blocked")
    public ResponseEntity<List<UserDto>> getBlockedUsers(@AuthenticationPrincipal UserPrincipal principal) {
        List<UserDto> blocked = userService.getBlockedUsers(principal.getId());
        return ResponseEntity.ok(blocked);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserProfile(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserDto user = userService.getUserById(userId);
        if (principal != null && userId.equals(principal.getId())) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.ok(user.toPublicDto());
    }

    @DeleteMapping("/admin/cleanup/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> cleanupUser(@PathVariable String username) {
        userService.deleteUserByUsername(username);
        return ResponseEntity.noContent().build();
    }
}
