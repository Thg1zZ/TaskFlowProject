package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO para receber o ID Token gerado pelo Google e o Nonce de sessão.
 * ASVS 3.5 — Verificação de assinaturas criptográficas e proteção contra CSRF.
 */
@Data
public class GoogleTokenRequest {

    @NotBlank(message = "ID Token do Google é obrigatório")
    private String idToken;

    @NotBlank(message = "Nonce de segurança (CSRF) é obrigatório")
    private String nonce;
}
