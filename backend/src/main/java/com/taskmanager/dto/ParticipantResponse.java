package com.taskmanager.dto;

import com.taskmanager.entity.ParticipantRole;
import com.taskmanager.entity.TaskParticipant;

import java.time.LocalDateTime;

public record ParticipantResponse(Long id, ParticipantRole role, LocalDateTime joinedAt, UserSummary user) {

    public record UserSummary(Long id, String name) {}

    public static ParticipantResponse fromEntity(TaskParticipant participant) {
        return new ParticipantResponse(
                participant.getId(),
                participant.getRole(),
                participant.getJoinedAt(),
                new UserSummary(participant.getUser().getId(), participant.getUser().getName()));
    }
}
