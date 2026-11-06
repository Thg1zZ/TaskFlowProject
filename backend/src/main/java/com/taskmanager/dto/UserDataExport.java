package com.taskmanager.dto;

import java.time.LocalDateTime;
import java.util.List;

/** [LGPD art. 18] Cópia dos dados pessoais do titular, entregue em JSON. */
public record UserDataExport(
        LocalDateTime exportedAt,
        Profile profile,
        List<TaskResponse> tasks,
        List<SharedTaskData> sharedWithMe,
        List<ShareLinkData> shareLinks,
        List<CategoryData> categories,
        List<CommentData> comments,
        List<NotificationData> notifications,
        List<LocalDateTime> accessDates) {

    public record Profile(Long id, String name, String email, String bio, String jobTitle, String role,
                          LocalDateTime createdAt, Boolean emailVerified, Boolean acceptedTerms,
                          LocalDateTime acceptedAt, String termsVersion, Boolean receiveNotifications,
                          String profileImage) {}

    public record SharedTaskData(Long taskId, String title, String role, LocalDateTime joinedAt) {}

    public record ShareLinkData(Long taskId, String role, LocalDateTime createdAt, LocalDateTime expiresAt, Boolean active) {}

    public record CategoryData(String name, String color, String icon, LocalDateTime createdAt) {}

    public record CommentData(Long taskId, String content, LocalDateTime createdAt) {}

    public record NotificationData(String type, String message, Boolean read, LocalDateTime createdAt) {}
}
