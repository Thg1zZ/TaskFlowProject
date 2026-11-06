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

    @NotNull(message = "{validation.time.required}")
    @Min(value = 1, message = "{validation.time.min}")
    @Max(value = 1440, message = "{validation.time.max}")
    private Integer minutes;
}
