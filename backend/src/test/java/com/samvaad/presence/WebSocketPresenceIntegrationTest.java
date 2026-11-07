package com.samvaad.presence;

import com.samvaad.presence.service.PresenceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class WebSocketPresenceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("samvaad_test")
            .withUsername("test_user")
            .withPassword("test_pass");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("samvaad.jwt.secret", () -> "dGVzdF9qd3Rfc2VjcmV0X2Zvcl90ZXN0Y29udGFpbmVyc192YWxpZGF0aW9uXzEyMzQ1Njc4OTA=");
    }

    @Autowired
    private PresenceService presenceService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Test
    @DisplayName("User heartbeat creates an expiring Redis key and reports user online")
    void testUserPresenceLifecycle() {
        String userId = "usr-88214";

        presenceService.setUserOnline(userId);

        Boolean exists = redisTemplate.hasKey("presence:user:" + userId);
        assertThat(exists).isTrue();

        Long expire = redisTemplate.getExpire("presence:user:" + userId);
        assertThat(expire).isPositive();

        boolean isOnline = presenceService.isUserOnline(userId);
        assertThat(isOnline).isTrue();

        presenceService.setUserOffline(userId);

        Boolean existsAfterLogout = redisTemplate.hasKey("presence:user:" + userId);
        assertThat(existsAfterLogout).isFalse();
    }
}
