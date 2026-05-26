package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminChangeRoleRequest {

    @NotBlank
    private String role; // "ROLE_USER" ou "ROLE_ADMIN"
}
