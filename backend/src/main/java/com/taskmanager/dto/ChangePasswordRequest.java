package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "Senha atual é obrigatória")
    private String currentPassword;

    @NotBlank(message = "Nova senha é obrigatória")
    /** [VULN-06 FIX] Mesma política de complexidade do registro */
    @Size(min = 10, message = "Nova senha deve ter pelo menos 10 caracteres")
    @jakarta.validation.constraints.Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).+$",
        message = "Senha deve conter maiúsculas, minúsculas, números e um caractere especial"
    )
    private String newPassword;
}
