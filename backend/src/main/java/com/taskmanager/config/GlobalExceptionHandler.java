package com.taskmanager.config;

import com.taskmanager.dto.ApiErrorResponse;
import com.taskmanager.exception.ResourceNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field   = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            fieldErrors.put(field, message);
        });
        return buildError(HttpStatus.BAD_REQUEST, "Dados inválidos", fieldErrors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraint(ConstraintViolationException ex) {
        return buildError(HttpStatus.BAD_REQUEST, "Dados inválidos", null);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return buildError(HttpStatus.UNAUTHORIZED, "Credenciais inválidas", null);
    }

    /**
     * [VULN-04 FIX] Exceções de "recurso não encontrado" retornam 404
     * com mensagem controlada. O campo exato NÃO é revelado (evita IDOR oracle).
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Recurso não encontrado: {}", ex.getMessage());
        return buildError(HttpStatus.NOT_FOUND, "Recurso não encontrado", null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArg(IllegalArgumentException ex) {
        // Safe to expose: these are intentional validation messages from services
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage(), null);
    }

    /**
     * [VULN-04 FIX] RuntimeException genérica NUNCA deve vazar ex.getMessage() ao cliente.
     * O detalhe real é logado internamente (ASVS 7.1.1).
     * Se você quiser retornar mensagens específicas, use exceções de domínio
     * como ResourceNotFoundException ou IllegalArgumentException.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiErrorResponse> handleRuntime(RuntimeException ex) {
        log.error("Erro de negócio não tratado: {}", ex.getMessage(), ex);
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, "Operação não pôde ser concluída", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneral(Exception ex) {
        log.error("Erro interno inesperado", ex);
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno do servidor", null);
    }

    private ResponseEntity<ApiErrorResponse> buildError(HttpStatus status,
                                                            String message,
                                                            Map<String, String> details) {
        ApiErrorResponse body = new ApiErrorResponse(status.value(), message, details);
        return ResponseEntity.status(status).body(body);
    }
}
