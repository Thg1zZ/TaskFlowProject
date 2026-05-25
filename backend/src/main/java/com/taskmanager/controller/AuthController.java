package com.taskmanager.controller;

import com.taskmanager.dto.AuthResponse;
import com.taskmanager.dto.LoginRequest;
import com.taskmanager.dto.RegisterRequest;
import com.taskmanager.dto.ForgotPasswordRequest;
import com.taskmanager.dto.ResetPasswordRequest;
import com.taskmanager.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.taskmanager.dto.GoogleTokenRequest;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpiration;

    private HttpHeaders createCookieHeader(String token) {
        ResponseCookie cookie = ResponseCookie.from("token", token)
                .httpOnly(true)
                .secure(false) // Use true in production if HTTPS
                .path("/")
                .maxAge(jwtExpiration / 1000)
                .sameSite("Strict")
                .build();
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, cookie.toString());
        return headers;
    }

    private HttpHeaders createLogoutCookie() {
        ResponseCookie cookie = ResponseCookie.from("token", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0) // Expira imediatamente
                .sameSite("Strict")
                .build();
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, cookie.toString());
        return headers;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .headers(createCookieHeader(response.getToken()))
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok()
                .headers(createCookieHeader(response.getToken()))
                .body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@CookieValue(name = "token", required = false) String token) {
        if (token != null && !token.isEmpty()) {
            authService.logout(token);
        }
        return ResponseEntity.ok()
                .headers(createLogoutCookie())
                .build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        // Sempre retornamos OK para não revelar se o email existe ou não
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleTokenRequest request) {
        AuthResponse response = authService.loginWithGoogle(request.getIdToken(), request.getNonce());
        return ResponseEntity.ok()
                .headers(createCookieHeader(response.getToken()))
                .body(response);
    }

    @GetMapping("/keep-alive")
    public ResponseEntity<Map<String, String>> keepAlive() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("message", "Backend is awake and operational");
        return ResponseEntity.ok(status);
    }
}

