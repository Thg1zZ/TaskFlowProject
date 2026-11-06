package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;


@Data
public class CategoryRequest {

    @NotBlank(message = "{validation.name.required}")
    @Size(min = 1, max = 50, message = "{validation.category.name.size}")
    private String name;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "{validation.category.color}")
    private String color;

    @Size(max = 10)
    private String icon;
}
