package com.taskmanager.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "{validation.name.required}")
    @Size(min = 2, max = 100, message = "{validation.register.name.size}")
    private String name;

    @NotBlank(message = "{validation.email.required}")
    @Email(message = "{validation.email.invalid}")
    private String email;

    @NotBlank(message = "{validation.password.required}")
    /**
     * [VULN-06 FIX] ASVS 2.1.1: política de senha mínima:
     * - Mínimo 10 caracteres
     * - Ao menos 1 maiúscula, 1 minúscula, 1 dígito e 1 especial
     */
    @Size(min = 10, message = "{validation.password.size}")
    @jakarta.validation.constraints.Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).+$",
        message = "{validation.password.complexity}"
    )
    private String password;

    @jakarta.validation.constraints.NotNull(message = "{validation.terms.required}")
    @jakarta.validation.constraints.AssertTrue(message = "{validation.terms.required}")
    private Boolean acceptedTerms;
}
