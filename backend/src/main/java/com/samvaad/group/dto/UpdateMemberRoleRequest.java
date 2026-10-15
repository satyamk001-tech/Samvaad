package com.samvaad.group.dto;

import com.samvaad.conversation.entity.ConversationRole;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberRoleRequest(
        @NotNull(message = "Role is required")
        ConversationRole role
) {}
