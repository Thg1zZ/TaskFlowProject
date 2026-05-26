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

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpiration;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    /**
     * [REF-03] Método unificado para criar/invalidar o cookie JWT.
     *
     * ANTES: createCookieHeader(token) e createLogoutCookie() duplicavam todos os
     * atributos do cookie (httpOnly, secure, path, sameSite). Qualquer mudança
     * precisava ser feita em dois lugares.
     *
     * AGORA: um único método com parâmetros value e maxAge:
     *   - Login:  buildTokenCookieHeaders(token, jwtExpiration / 1000)
     *   - Logout: buildTokenCookieHeaders("", 0)
     */
    private HttpHeaders buildTokenCookieHeaders(String value, long maxAge) {
        ResponseCookie cookie = ResponseCookie.from("token", value)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(maxAge)
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
                .headers(buildTokenCookieHeaders(response.getToken(), jwtExpiration / 1000))
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok()
                .headers(buildTokenCookieHeaders(response.getToken(), jwtExpiration / 1000))
                .body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@CookieValue(name = "token", required = false) String token) {
        if (token != null && !token.isEmpty()) {
            authService.logout(token);
        }
        return ResponseEntity.ok()
                .headers(buildTokenCookieHeaders("", 0))
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
                .headers(buildTokenCookieHeaders(response.getToken(), jwtExpiration / 1000))
                .body(response);
    }

    @GetMapping("/keep-alive")
    public ResponseEntity<Map<String, String>> keepAlive() {
        // [REF-08] Map.of() imutável e conciso — substituiu new HashMap<>() + 2x put()
        return ResponseEntity.ok(Map.of(
            "status",  "UP",
            "message", "Backend is awake and operational"
        ));
    }
}
