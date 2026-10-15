package com.viora.user.controller;

import com.viora.auth.security.UserPrincipal;
import com.viora.user.dto.UpdateProfileRequest;
import com.viora.user.dto.UserDto;
import com.viora.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
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

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "q", required = false) String q
    ) {
        String effectiveQuery = (query != null && !query.isBlank()) ? query : q;
        List<UserDto> users = userService.searchUsers(effectiveQuery);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserProfile(@PathVariable UUID userId) {
        UserDto user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }

    @DeleteMapping("/admin/cleanup/{username}")
    public ResponseEntity<Void> cleanupUser(@PathVariable String username) {
        userService.deleteUserByUsername(username);
        return ResponseEntity.noContent().build();
    }
}
