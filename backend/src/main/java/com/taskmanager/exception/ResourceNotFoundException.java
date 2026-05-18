package com.taskmanager.exception;

/**
 * Exce\u00e7\u00e3o lan\u00e7ada quando um recurso n\u00e3o \u00e9 encontrado OU pertence a outro usu\u00e1rio.
 *
 * [VULN-04 FIX] Separa exce\u00e7\u00f5es de dom\u00ednio de RuntimeException gen\u00e9rica,
 * permitindo que o GlobalExceptionHandler retorne mensagens controladas
 * sem vazar detalhes internos da aplica\u00e7\u00e3o.
 *
 * IMPORTANTE: N\u00e3o diferencie "n\u00e3o encontrado" de "sem permiss\u00e3o" na mensagem
 * ao cliente — isso evita IDOR oracle (o atacante n\u00e3o sabe se o recurso existe).
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
