package com.taskmanager.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Email
    @NotBlank
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @Column(nullable = false)
    @JsonIgnore
    private String password;

    @Column(length = 200)
    private String bio;

    @Column(name = "job_title", length = 50)
    private String jobTitle;

    @Column(name = "profile_image", columnDefinition = "TEXT")
    private String profileImage;

    /**
     * [ASVS 4.1] Controle de Acesso Baseado em Perfis (RBAC).
     * O padrão para novos usuários cadastrados é sempre ROLE_USER.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)  // [SEC-05] ROLE_SUPER_ADMIN = 16 chars — mínimo 30 para consistência com DDL
    @Builder.Default
    private UserRole role = UserRole.ROLE_USER;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Task> tasks;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Category> categories;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<TaskComment> comments;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<PasswordResetToken> passwordResetTokens;

    @Column(name = "accepted_terms", nullable = false)
    @Builder.Default
    private Boolean acceptedTerms = false;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "terms_version", length = 10)
    private String termsVersion;

    @Column(name = "has_completed_onboarding", nullable = false)
    @Builder.Default
    private Boolean hasCompletedOnboarding = false;

    @Column(name = "receive_notifications", nullable = false)
    @Builder.Default
    private Boolean receiveNotifications = true;

    @Column(name = "theme_preferences", columnDefinition = "TEXT")
    private String themePreferences;

    /** Tokens emitidos antes deste instante são recusados. */
    @Column(name = "password_changed_at")
    @JsonIgnore
    private Instant passwordChangedAt;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private Boolean emailVerified = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /** Troca a senha e invalida todas as sessões abertas. */
    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
        this.passwordChangedAt = Instant.now();
    }
}
