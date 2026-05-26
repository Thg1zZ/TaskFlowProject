package com.taskmanager.security;

import com.taskmanager.entity.ParticipantRole;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.TaskParticipant;
import com.taskmanager.repository.TaskParticipantRepository;
import com.taskmanager.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service("taskSecurity")
@RequiredArgsConstructor
public class TaskSecurityService {

    private final TaskRepository taskRepository;
    private final TaskParticipantRepository participantRepository;
    private final SecurityService securityService;

    @Transactional(readOnly = true)
    public boolean canView(Long taskId) {
        Long currentUserId = securityService.getCurrentUserId();
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return false;

        // Is owner?
        if (task.getUser().getId().equals(currentUserId)) return true;

        // Is public?
        if (task.getPrivacyMode() == Task.TaskPrivacy.PUBLIC) return true;

        // Is explicit participant?
        return participantRepository.existsByTaskIdAndUserId(taskId, currentUserId);
    }

    @Transactional(readOnly = true)
    public boolean canEdit(Long taskId) {
        Long currentUserId = securityService.getCurrentUserId();
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return false;

        // Is owner?
        if (task.getUser().getId().equals(currentUserId)) return true;

        // Has editing rights?
        Optional<TaskParticipant> participant = participantRepository.findByTaskIdAndUserId(taskId, currentUserId);
        if (participant.isPresent()) {
            ParticipantRole role = participant.get().getRole();
            return role == ParticipantRole.ADMIN || role == ParticipantRole.EDITOR;
        }

        return false;
    }

    @Transactional(readOnly = true)
    public boolean canShare(Long taskId) {
        Long currentUserId = securityService.getCurrentUserId();
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return false;

        // Is owner?
        if (task.getUser().getId().equals(currentUserId)) return true;

        // Is Admin?
        Optional<TaskParticipant> participant = participantRepository.findByTaskIdAndUserId(taskId, currentUserId);
        return participant.map(p -> p.getRole() == ParticipantRole.ADMIN).orElse(false);
    }
}
