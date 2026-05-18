package com.taskmanager.dto;

import com.taskmanager.entity.User;
import com.taskmanager.entity.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserResponse {
    private Long id;
    private String name;
    private String email;
    private String bio;
    private String jobTitle;
    private UserRole role;
    private LocalDateTime createdAt;
    private long taskCount;

    public static AdminUserResponse fromEntity(User user, long taskCount) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .bio(user.getBio())
                .jobTitle(user.getJobTitle())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .taskCount(taskCount)
                .build();
    }
}
