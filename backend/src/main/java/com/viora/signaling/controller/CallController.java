package com.viora.signaling.controller;

import com.viora.auth.security.UserPrincipal;
import com.viora.signaling.dto.CallDto;
import com.viora.signaling.dto.InitiateCallRequest;
import com.viora.signaling.service.SignalingService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/calls")
public class CallController {

    private final SignalingService signalingService;

    public CallController(SignalingService signalingService) {
        this.signalingService = signalingService;
    }

    @PostMapping("/initiate")
    public ResponseEntity<CallDto> initiateCall(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InitiateCallRequest request
    ) {
        CallDto call = signalingService.initiateCall(principal.getId(), request);
        return ResponseEntity.ok(call);
    }

    @GetMapping("/history")
    public ResponseEntity<Page<CallDto>> getCallHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20, sort = "startedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<CallDto> history = signalingService.getUserCallHistory(principal.getId(), pageable);
        return ResponseEntity.ok(history);
    }
}
