package com.taskmanager.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    private String name;

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;

    @NotBlank(message = "Senha é obrigatória")
    /**
     * [VULN-06 FIX] ASVS 2.1.1 — Política de senha mínima:
     * - Mínimo 10 caracteres
     * - Ao menos 1 maiúscula, 1 minúscula, 1 dígito e 1 especial
     */
    @Size(min = 10, message = "Senha deve ter pelo menos 10 caracteres")
    @jakarta.validation.constraints.Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).+$",
        message = "Senha deve conter maiúsculas, minúsculas, números e um caractere especial"
    )
    private String password;
}
