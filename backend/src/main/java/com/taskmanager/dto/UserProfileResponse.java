package com.taskmanager.dto;

import java.time.LocalDateTime;

public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String bio;
    private String jobTitle;
    private String profileImage;
    private LocalDateTime createdAt;
    private String role;
    private Boolean hasCompletedOnboarding;
    private Boolean receiveNotifications;
    private String themePreferences;
    private UserStatsDTO stats;

    public static class UserStatsDTO {
        private long total;
        private long done;
        private long inProgress;
        private long todo;
        private long completionRate;

        public UserStatsDTO() {}

        public UserStatsDTO(long total, long done, long inProgress, long todo, long completionRate) {
            this.total = total;
            this.done = done;
            this.inProgress = inProgress;
            this.todo = todo;
            this.completionRate = completionRate;
        }

        public long getTotal() { return total; }
        public void setTotal(long total) { this.total = total; }
        public long getDone() { return done; }
        public void setDone(long done) { this.done = done; }
        public long getInProgress() { return inProgress; }
        public void setInProgress(long inProgress) { this.inProgress = inProgress; }
        public long getTodo() { return todo; }
        public void setTodo(long todo) { this.todo = todo; }
        public long getCompletionRate() { return completionRate; }
        public void setCompletionRate(long completionRate) { this.completionRate = completionRate; }
    }

    public UserProfileResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Boolean getHasCompletedOnboarding() { return hasCompletedOnboarding; }
    public void setHasCompletedOnboarding(Boolean hasCompletedOnboarding) { this.hasCompletedOnboarding = hasCompletedOnboarding; }
    public Boolean getReceiveNotifications() { return receiveNotifications; }
    public void setReceiveNotifications(Boolean receiveNotifications) { this.receiveNotifications = receiveNotifications; }
    public UserStatsDTO getStats() { return stats; }
    public void setStats(UserStatsDTO stats) { this.stats = stats; }
    public String getThemePreferences() { return themePreferences; }
    public void setThemePreferences(String themePreferences) { this.themePreferences = themePreferences; }
}
