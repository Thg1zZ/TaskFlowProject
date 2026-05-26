package com.taskmanager.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminChangeEmailRequest {

    @Email
    @NotBlank
    private String email;
}
