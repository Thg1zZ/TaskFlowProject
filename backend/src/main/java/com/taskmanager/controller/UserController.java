package com.taskmanager.controller;

import com.taskmanager.dto.ChangePasswordRequest;
import com.taskmanager.dto.UserProfileRequest;
import com.taskmanager.dto.UserProfileResponse;
import com.taskmanager.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @PatchMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        return ResponseEntity.ok(userService.changePassword(req));
    }
}
