package com.taskmanager.exception;

/**
 * Excecao lancada quando o servico de e-mail falha ao disparar uma mensagem.
 *
 * Separada de RuntimeException generica para que o GlobalExceptionHandler
 * possa retornar ao cliente uma mensagem controlada (sem stack trace de SMTP).
 * ASVS 7.1.1 — não expor detalhes de infraestrutura ao cliente.
 */
public class EmailDeliveryException extends RuntimeException {
    public EmailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
