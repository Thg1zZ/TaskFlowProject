package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank
    private String token;

    @NotBlank(message = "Nova senha é obrigatória")
    @Size(min = 10, message = "Nova senha deve ter pelo menos 10 caracteres")
    @jakarta.validation.constraints.Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).+$",
        message = "Senha deve conter maiúsculas, minúsculas, números e um caractere especial"
    )
    private String newPassword;
}
