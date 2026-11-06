package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO para receber o ID Token gerado pelo Google e o Nonce de sessão.
 * ASVS 3.5: verificação de assinaturas criptográficas e proteção contra CSRF.
 */
@Data
public class GoogleTokenRequest {

    @NotBlank(message = "{validation.google.idToken}")
    private String idToken;

    @NotBlank(message = "{validation.google.nonce}")
    private String nonce;
}
