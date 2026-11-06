package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;


@Data
public class CommentRequest {

    @NotBlank(message = "{validation.comment.required}")
    @Size(max = 1000)
    private String content;
}
