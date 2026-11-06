package com.taskmanager.dto;

import lombok.Data;

/** Contas com senha confirmam com ela; contas criadas pelo Google confirmam digitando o próprio e-mail. */
@Data
public class DeleteAccountRequest {
    private String password;
    private String confirmEmail;
}
