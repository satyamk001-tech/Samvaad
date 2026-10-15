package com.samvaad.conversation.controller;

import com.samvaad.auth.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class UserPreferencesController {

    private final JdbcTemplate jdbcTemplate;

    public UserPreferencesController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // --- PINNED CONVERSATIONS ---
    @GetMapping("/users/me/pinned-conversations")
    public ResponseEntity<List<String>> getPinnedConversations(@AuthenticationPrincipal UserPrincipal principal) {
        List<String> pinnedIds = jdbcTemplate.query(
                "SELECT conversation_id FROM user_pinned_conversations WHERE user_id = ? ORDER BY pin_order ASC, created_at ASC",
                (rs, rowNum) -> rs.getString("conversation_id"),
                principal.getId()
        );
        return ResponseEntity.ok(pinnedIds);
    }

    @PostMapping("/conversations/{conversationId}/pin")
    public ResponseEntity<Map<String, Object>> togglePin(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user_pinned_conversations WHERE user_id = ? AND conversation_id = ?",
                Integer.class,
                principal.getId(), conversationId
        );

        boolean isPinned;
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "DELETE FROM user_pinned_conversations WHERE user_id = ? AND conversation_id = ?",
                    principal.getId(), conversationId
            );
            isPinned = false;
        } else {
            // Cap at 5 pinned conversations
            Integer totalPinned = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM user_pinned_conversations WHERE user_id = ?",
                    Integer.class,
                    principal.getId()
            );
            if (totalPinned != null && totalPinned >= 5) {
                return ResponseEntity.badRequest().body(Map.of("error", "Maximum 5 pinned conversations allowed"));
            }

            jdbcTemplate.update(
                    "INSERT INTO user_pinned_conversations (user_id, conversation_id, pin_order) VALUES (?, ?, ?)",
                    principal.getId(), conversationId, totalPinned != null ? totalPinned : 0
            );
            isPinned = true;
        }

        return ResponseEntity.ok(Map.of("conversationId", conversationId, "isPinned", isPinned));
    }

    // --- STARRED MESSAGES ---
    @GetMapping("/users/me/starred-messages")
    public ResponseEntity<List<Map<String, Object>>> getStarredMessages(@AuthenticationPrincipal UserPrincipal principal) {
        List<Map<String, Object>> starred = jdbcTemplate.query(
                """
                SELECT sm.message_id, sm.conversation_id, sm.created_at as starred_at,
                       m.content, m.type, m.created_at as sent_at,
                       u.id as sender_id, u.display_name, u.username
                FROM user_starred_messages sm
                JOIN messages m ON sm.message_id = m.id
                JOIN users u ON m.sender_id = u.id
                WHERE sm.user_id = ?
                ORDER BY sm.created_at DESC
                """,
                (rs, rowNum) -> Map.of(
                        "messageId", rs.getString("message_id"),
                        "conversationId", rs.getString("conversation_id"),
                        "starredAt", rs.getTimestamp("starred_at").toString(),
                        "content", rs.getString("content") != null ? rs.getString("content") : "",
                        "type", rs.getString("type"),
                        "sentAt", rs.getTimestamp("sent_at").toString(),
                        "senderName", rs.getString("display_name") != null ? rs.getString("display_name") : rs.getString("username")
                ),
                principal.getId()
        );
        return ResponseEntity.ok(starred);
    }

    @PostMapping("/messages/{messageId}/star")
    public ResponseEntity<Map<String, Object>> toggleStar(
            @PathVariable UUID messageId,
            @RequestParam(required = false) UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user_starred_messages WHERE user_id = ? AND message_id = ?",
                Integer.class,
                principal.getId(), messageId
        );

        boolean isStarred;
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "DELETE FROM user_starred_messages WHERE user_id = ? AND message_id = ?",
                    principal.getId(), messageId
            );
            isStarred = false;
        } else {
            UUID convId = conversationId;
            if (convId == null) {
                convId = jdbcTemplate.queryForObject(
                        "SELECT conversation_id FROM messages WHERE id = ?",
                        UUID.class,
                        messageId
                );
            }

            jdbcTemplate.update(
                    "INSERT INTO user_starred_messages (user_id, message_id, conversation_id) VALUES (?, ?, ?)",
                    principal.getId(), messageId, convId
            );
            isStarred = true;
        }

        return ResponseEntity.ok(Map.of("messageId", messageId, "isStarred", isStarred));
    }

    // --- DISAPPEARING MESSAGES SETTINGS ---
    @PutMapping("/conversations/{conversationId}/disappearing")
    public ResponseEntity<Map<String, Object>> setDisappearingTimer(
            @PathVariable UUID conversationId,
            @RequestBody Map<String, Integer> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Integer seconds = payload.get("seconds"); // null or seconds (86400, 604800, 7776000)
        jdbcTemplate.update(
                "UPDATE conversations SET disappearing_seconds = ? WHERE id = ?",
                seconds, conversationId
        );
        return ResponseEntity.ok(Map.of("conversationId", conversationId, "disappearingSeconds", seconds != null ? seconds : 0));
    }

    // --- CHAT FOLDER TAG ---
    @PutMapping("/conversations/{conversationId}/folder")
    public ResponseEntity<Map<String, Object>> setFolderTag(
            @PathVariable UUID conversationId,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        String tag = payload.getOrDefault("folderTag", "ALL"); // ALL, PERSONAL, WORK, GROUPS
        jdbcTemplate.update(
                "UPDATE conversation_members SET folder_tag = ? WHERE conversation_id = ? AND user_id = ?",
                tag, conversationId, principal.getId()
        );
        return ResponseEntity.ok(Map.of("conversationId", conversationId, "folderTag", tag));
    }
}
