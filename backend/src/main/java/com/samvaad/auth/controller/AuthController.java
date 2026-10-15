package com.samvaad.auth.controller;

import com.samvaad.auth.dto.*;
import com.samvaad.auth.security.UserPrincipal;
import com.samvaad.auth.service.AuthService;
import com.samvaad.user.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final com.samvaad.auth.service.OtpVerificationService otpVerificationService;

    public AuthController(AuthService authService, com.samvaad.auth.service.OtpVerificationService otpVerificationService) {
        this.authService = authService;
        this.otpVerificationService = otpVerificationService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleAuthRequest request) {
        AuthResponse response = authService.googleLogin(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/phone")
    public ResponseEntity<AuthResponse> phoneLogin(@Valid @RequestBody PhoneAuthRequest request) {
        AuthResponse response = authService.phoneLogin(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/send")
    public ResponseEntity<Map<String, Object>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        Map<String, Object> result = otpVerificationService.generateAndSendOtp(request.email());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        boolean verified = otpVerificationService.verifyOtp(request.email(), request.otpCode());
        return ResponseEntity.ok(Map.of("verified", verified, "message", "Verified successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(principal);
        return ResponseEntity.ok(Map.of("message", "Successfully logged out"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        UserDto currentUser = authService.getCurrentUser(principal);
        return ResponseEntity.ok(currentUser);
    }
}
