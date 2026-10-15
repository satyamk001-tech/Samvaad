package com.samvaad.group.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record AddGroupMembersRequest(
        @NotEmpty(message = "User IDs to add cannot be empty")
        List<UUID> userIds
) {}
