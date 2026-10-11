package com.viora.group.dto;

import com.viora.conversation.entity.ConversationRole;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberRoleRequest(
        @NotNull(message = "Role is required")
        ConversationRole role
) {}
