package com.taskmanager.controller;

import com.taskmanager.dto.ChangePasswordRequest;
import com.taskmanager.dto.UserProfileRequest;
import com.taskmanager.dto.UserProfileResponse;
import com.taskmanager.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getProfile() {
        return ResponseEntity.ok(userService.getProfile());
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(@Valid @RequestBody UserProfileRequest req) {
        return ResponseEntity.ok(userService.updateProfile(req));
    }

    @PostMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(userService.changePassword(request));
    }

    @PostMapping(value = "/me/avatar", consumes = "multipart/form-data")
    public ResponseEntity<UserProfileResponse> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.uploadAvatar(file));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> deleteAccount(@Valid @RequestBody com.taskmanager.dto.DeleteAccountRequest request) {
        userService.deleteAccount(request);
        return ResponseEntity.ok(Map.of("message", "Sua conta foi excluída com sucesso."));
    }

    @PostMapping("/me/onboarding")
    public ResponseEntity<UserProfileResponse> completeOnboarding() {
        return ResponseEntity.ok(userService.completeOnboarding());
    }

    @PatchMapping("/me/preferences")
    public ResponseEntity<Map<String, String>> updateThemePreferences(@RequestBody Map<String, String> request) {
        userService.updateThemePreferences(request.get("themePreferences"));
        return ResponseEntity.ok(Map.of("message", "Preferências atualizadas com sucesso"));
    }
}
