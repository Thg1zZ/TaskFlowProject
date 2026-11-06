package com.taskmanager.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Formula;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "tasks")
@Data
@EqualsAndHashCode(exclude = {"user", "category", "comments", "participants", "tags", "subtasks"})
@ToString(exclude = {"user", "category", "comments", "participants", "tags", "subtasks"})
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskPriority priority;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** Estimativa em minutos */
    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    /** Minutos reais trabalhados (Time Tracking) */
    @Column(name = "time_spent_minutes")
    private Integer timeSpentMinutes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @JsonIgnore
    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TaskComment> comments;

    /** Contagem derivada no SELECT, que evita lazy load de {@code comments} com open-in-view desligado */
    @Formula("(select count(*) from task_comments c where c.task_id = id)")
    private long commentCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy_mode", nullable = false)
    @Builder.Default
    private TaskPrivacy privacyMode = TaskPrivacy.PRIVATE;

    @JsonIgnore
    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<TaskParticipant> participants = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private TaskRecurrence recurrence;

    /** BatchSize evita uma consulta por tarefa ao carregar a lista. */
    @ElementCollection
    @CollectionTable(name = "task_tags", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "tag", length = 30, nullable = false)
    @BatchSize(size = 100)
    @Builder.Default
    private Set<String> tags = new LinkedHashSet<>();

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    @BatchSize(size = 100)
    @Builder.Default
    private List<Subtask> subtasks = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = TaskStatus.TODO;
        if (priority == null) priority = TaskPriority.MEDIUM;
        if (timeSpentMinutes == null) timeSpentMinutes = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum TaskStatus {
        TODO, IN_PROGRESS, DONE
    }

    public enum TaskPriority {
        LOW, MEDIUM, HIGH
    }

    public enum TaskPrivacy {
        PRIVATE, PUBLIC
    }

    public enum TaskRecurrence {
        DAILY, WEEKLY, MONTHLY;

        public LocalDate next(LocalDate date) {
            return switch (this) {
                case DAILY -> date.plusDays(1);
                case WEEKLY -> date.plusWeeks(1);
                case MONTHLY -> date.plusMonths(1);
            };
        }
    }
}
