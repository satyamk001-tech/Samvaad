package com.samvaad.messaging.dto;

import java.util.List;

public record ReactionSummaryDto(
        String emoji,
        int count,
        List<String> users
) {}
