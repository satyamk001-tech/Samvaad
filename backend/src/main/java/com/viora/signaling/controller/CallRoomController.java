package com.viora.signaling.controller;

import com.viora.auth.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/calls")
public class CallRoomController {

    private final JdbcTemplate jdbcTemplate;

    public CallRoomController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostMapping("/rooms/create")
    public ResponseEntity<Map<String, Object>> createRoom(
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String callType = body != null && body.containsKey("callType") ? body.get("callType") : "VIDEO";
        String title = body != null && body.containsKey("title") ? body.get("title") : "Samvaad Instant Meet";

        // Generate clean alphanumeric room code (e.g. smv-9a2f-41b)
        String roomCode = "smv-" + UUID.randomUUID().toString().substring(0, 8);
        UUID roomId = UUID.randomUUID();

        jdbcTemplate.update(
                "INSERT INTO call_rooms (id, room_code, host_id, call_type, title, is_active) VALUES (?, ?, ?, ?, ?, TRUE)",
                roomId, roomCode, principal.getId(), callType, title
        );

        String meetUrl = "http://localhost:5173/?meet=" + roomCode;

        return ResponseEntity.ok(Map.of(
                "roomId", roomId.toString(),
                "roomCode", roomCode,
                "callType", callType,
                "title", title,
                "meetUrl", meetUrl
        ));
    }

    @GetMapping("/rooms/{roomCode}")
    public ResponseEntity<Map<String, Object>> getRoomInfo(@PathVariable String roomCode) {
        List<Map<String, Object>> rooms = jdbcTemplate.query(
                """
                SELECT cr.id, cr.room_code, cr.call_type, cr.title, cr.is_active, cr.created_at,
                       u.id as host_id, u.display_name as host_name
                FROM call_rooms cr
                JOIN users u ON cr.host_id = u.id
                WHERE cr.room_code = ? AND cr.is_active = TRUE
                """,
                (rs, rowNum) -> Map.of(
                        "roomId", rs.getString("id"),
                        "roomCode", rs.getString("room_code"),
                        "callType", rs.getString("call_type"),
                        "title", rs.getString("title"),
                        "hostId", rs.getString("host_id"),
                        "hostName", rs.getString("host_name")
                ),
                roomCode
        );

        if (rooms.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(rooms.get(0));
    }
}
