package com.taskmanager.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimeTrackingRequest {

    @NotNull(message = "Os minutos são obrigatórios")
    @Min(value = 1, message = "Os minutos a incrementar devem ser de no mínimo 1")
    @Max(value = 1440, message = "Os minutos a incrementar não podem exceder 24 horas (1440 minutos)")
    private Integer minutes;
}
