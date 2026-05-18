package com.taskmanager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.taskmanager.entity.UserRole;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String tokenType = "Bearer";
    private Long userId;
    private String name;
    private String email;

    private UserRole role;

    public AuthResponse(String token, Long userId, String name, String email, com.taskmanager.entity.UserRole role) {
        this.token = token;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
    }
}
