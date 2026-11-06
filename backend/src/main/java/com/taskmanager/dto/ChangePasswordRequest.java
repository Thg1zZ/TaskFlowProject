package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "{validation.password.current.required}")
    private String currentPassword;

    @NotBlank(message = "{validation.password.new.required}")
    /** [VULN-06 FIX] Mesma política de complexidade do registro */
    @Size(min = 10, message = "{validation.password.new.size}")
    @jakarta.validation.constraints.Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).+$",
        message = "{validation.password.complexity}"
    )
    private String newPassword;
}
