package com.viora.common.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HealthControllerTest {

    @Test
    void shouldReturnHealthStatusUp() {
        HealthController controller = new HealthController();
        ResponseEntity<Map<String, Object>> response = controller.getHealthStatus();

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("viora-backend", response.getBody().get("service"));
        assertNotNull(response.getBody().get("timestamp"));
    }
}
