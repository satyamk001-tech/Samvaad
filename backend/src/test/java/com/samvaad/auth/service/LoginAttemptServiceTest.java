package com.samvaad.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        loginAttemptService = new LoginAttemptService();
    }

    @Test
    @DisplayName("User is not blocked initially")
    void isBlocked_initial_returnsFalse() {
        assertThat(loginAttemptService.isBlocked("alice")).isFalse();
    }

    @Test
    @DisplayName("User is blocked after 5 failed attempts")
    void loginFailed_afterFiveAttempts_blocksUser() {
        String identifier = "alice";

        for (int i = 0; i < 4; i++) {
            loginAttemptService.loginFailed(identifier);
            assertThat(loginAttemptService.isBlocked(identifier)).isFalse();
        }

        // 5th failed attempt
        loginAttemptService.loginFailed(identifier);
        assertThat(loginAttemptService.isBlocked(identifier)).isTrue();
    }

    @Test
    @DisplayName("Successful login clears failed attempts")
    void loginSucceeded_resetsAttemptCount() {
        String identifier = "bob";

        for (int i = 0; i < 4; i++) {
            loginAttemptService.loginFailed(identifier);
        }

        loginAttemptService.loginSucceeded(identifier);

        // After success, 1 failure should not block
        loginAttemptService.loginFailed(identifier);
        assertThat(loginAttemptService.isBlocked(identifier)).isFalse();
    }
}
