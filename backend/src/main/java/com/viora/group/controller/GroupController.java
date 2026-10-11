package com.viora.group.controller;

import com.viora.auth.security.UserPrincipal;
import com.viora.conversation.dto.ConversationDto;
import com.viora.group.dto.AddGroupMembersRequest;
import com.viora.group.dto.UpdateGroupMetadataRequest;
import com.viora.group.dto.UpdateMemberRoleRequest;
import com.viora.group.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<ConversationDto> addMembers(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AddGroupMembersRequest request
    ) {
        ConversationDto response = groupService.addMembers(groupId, principal.getId(), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<ConversationDto> removeMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ConversationDto response = groupService.removeMember(groupId, principal.getId(), userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<Map<String, String>> leaveGroup(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        groupService.leaveGroup(groupId, principal.getId());
        return ResponseEntity.ok(Map.of("message", "Successfully left the group"));
    }

    @PatchMapping("/{groupId}/members/{userId}/role")
    public ResponseEntity<ConversationDto> updateMemberRole(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateMemberRoleRequest request
    ) {
        ConversationDto response = groupService.updateMemberRole(groupId, principal.getId(), userId, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{groupId}")
    public ResponseEntity<ConversationDto> updateGroupMetadata(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateGroupMetadataRequest request
    ) {
        ConversationDto response = groupService.updateGroupMetadata(groupId, principal.getId(), request);
        return ResponseEntity.ok(response);
    }
}
