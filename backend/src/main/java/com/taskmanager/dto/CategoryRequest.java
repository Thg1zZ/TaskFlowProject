package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;


@Data
public class CategoryRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 1, max = 50, message = "Nome deve ter entre 1 e 50 caracteres")
    private String name;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Cor deve ser um hex válido (ex: #3b82f6)")
    private String color;

    @Size(max = 10)
    private String icon;
}
