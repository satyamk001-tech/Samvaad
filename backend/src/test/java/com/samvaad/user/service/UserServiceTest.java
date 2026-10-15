package com.samvaad.user.service;

import com.samvaad.common.exception.ResourceNotFoundException;
import com.samvaad.user.dto.UpdateProfileRequest;
import com.samvaad.user.dto.UserDto;
import com.samvaad.user.entity.User;
import com.samvaad.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
    }

    @Test
    void shouldGetUserByIdSuccessfully() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .username("sarah_chen")
                .email("sarah@samvaad.gov.in")
                .displayName("Sarah Chen")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserDto dto = userService.getUserById(userId);

        assertNotNull(dto);
        assertEquals("sarah_chen", dto.username());
        assertEquals("Sarah Chen", dto.displayName());
    }

    @Test
    void shouldThrowResourceNotFoundExceptionWhenUserDoesNotExist() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(userId));
    }

    @Test
    void shouldSearchUsersByQuery() {
        User user1 = User.builder().id(UUID.randomUUID()).username("elena").displayName("Elena Rostova").build();
        User user2 = User.builder().id(UUID.randomUUID()).username("eric").displayName("Eric Thorne").build();

        when(userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase("elena", "elena"))
                .thenReturn(List.of(user1));

        List<UserDto> results = userService.searchUsers("elena");

        assertEquals(1, results.size());
        assertEquals("elena", results.get(0).username());
    }

    @Test
    void shouldUpdateProfileSuccessfully() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .username("sarah")
                .displayName("Sarah")
                .bio("Old Bio")
                .build();

        UpdateProfileRequest request = new UpdateProfileRequest("Sarah Chen", "Senior Product Designer", "https://avatar.url", "Working Remotely");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDto updated = userService.updateProfile(userId, request);

        assertEquals("Sarah Chen", updated.displayName());
        assertEquals("Senior Product Designer", updated.bio());
        assertEquals("Working Remotely", updated.statusMessage());
    }
}
