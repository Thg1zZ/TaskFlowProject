package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserProfileRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 2, max = 100)
    private String name;

    @Size(max = 200)
    private String bio;

    @Size(max = 50)
    private String jobTitle;

    /**
     * [VULN-03 FIX] Limite reduzido de 1.4 MB para ~50 KB de Base64
     * (equivale a ~37 KB de imagem real — suficiente para avatar 200x200px).
     * O @Pattern garante que o campo seja um Data URL de imagem válida,
     * impedindo que HTML/JS sejam armazenados neste campo (XSS stored).
     */
    @Size(max = 50000, message = "Imagem muito grande. Use uma imagem menor (máx. ~37 KB).")
    @Pattern(
        regexp = "^(data:image/(jpeg|png|gif|webp|svg\\+xml);base64,[A-Za-z0-9+/=]+)?$",
        message = "Formato de imagem inválido. Use JPEG, PNG, GIF ou WebP em Base64."
    )
    private String profileImage;
}
