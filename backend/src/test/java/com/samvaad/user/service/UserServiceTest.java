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

    @Mock
    private com.samvaad.user.repository.UserBlockRepository userBlockRepository;

    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, userBlockRepository, jdbcTemplate);
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
    void shouldSearchUserByExactUsernameIgnoringCaseAndAtSign() {
        User user1 = User.builder().id(UUID.randomUUID()).username("elena").displayName("Elena Rostova").build();

        when(userRepository.findByUsernameIgnoreCase(argThat(s -> s != null && s.equalsIgnoreCase("elena"))))
                .thenReturn(Optional.of(user1));

        List<UserDto> resultsWithAt = userService.searchUsers("  @Elena  ");
        assertEquals(1, resultsWithAt.size());
        assertEquals("elena", resultsWithAt.get(0).username());

        List<UserDto> resultsPlain = userService.searchUsers("elena");
        assertEquals(1, resultsPlain.size());
        assertEquals("elena", resultsPlain.get(0).username());
    }

    @Test
    void shouldReturnEmptyWhenExactUsernameNotFound() {
        when(userRepository.findByUsernameIgnoreCase("unknown_user"))
                .thenReturn(Optional.empty());

        List<UserDto> results = userService.searchUsers("@unknown_user");
        assertTrue(results.isEmpty());
    }

    @Test
    void shouldReturnEmptyForBlankOrEmptyQuery() {
        assertTrue(userService.searchUsers("").isEmpty());
        assertTrue(userService.searchUsers("   ").isEmpty());
        assertTrue(userService.searchUsers("@").isEmpty());
        assertTrue(userService.searchUsers("  @  ").isEmpty());
        assertTrue(userService.searchUsers(null).isEmpty());
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
