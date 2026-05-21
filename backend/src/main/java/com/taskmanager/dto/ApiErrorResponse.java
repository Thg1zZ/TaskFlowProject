package com.taskmanager.dto;

import java.util.Map;

public class ApiErrorResponse {
    private int status;
    private String error;
    private Map<String, String> details;

    public ApiErrorResponse(int status, String error, Map<String, String> details) {
        this.status = status;
        this.error = error;
        this.details = details;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public Map<String, String> getDetails() {
        return details;
    }

    public void setDetails(Map<String, String> details) {
        this.details = details;
    }
}
