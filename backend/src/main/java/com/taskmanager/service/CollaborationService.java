package com.taskmanager.service;

import com.taskmanager.entity.*;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.exception.UnauthorizedException;
import com.taskmanager.repository.ShareLinkRepository;
import com.taskmanager.repository.TaskParticipantRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CollaborationService {

    private final TaskRepository taskRepository;
    private final TaskParticipantRepository participantRepository;
    private final ShareLinkRepository shareLinkRepository;
    private final UserRepository userRepository;
    private final SecurityService securityService;
    private final RealTimeSseService sseService;

    @Transactional
    public ShareLink generateShareLink(Long taskId, ParticipantRole role, Integer expireInHours) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));

        // Desativa links anteriores para mesma tarefa (opcional - no nosso caso deixamos criar multiplos ou invalidamos o ativo)
        shareLinkRepository.findByTaskIdAndIsActiveTrue(taskId).ifPresent(link -> {
            link.setIsActive(false);
            shareLinkRepository.save(link);
        });

        LocalDateTime expiresAt = expireInHours != null ? LocalDateTime.now().plusHours(expireInHours) : null;

        ShareLink link = ShareLink.builder()
                .task(task)
                .createdBy(securityService.getCurrentUser())
                .roleGranted(role)
                .expiresAt(expiresAt)
                .build();

        return shareLinkRepository.save(link);
    }

    @Transactional
    public TaskParticipant joinViaLink(UUID token) {
        ShareLink link = shareLinkRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Link de convite inválido ou não encontrado"));

        if (!link.getIsActive()) {
            throw new UnauthorizedException("Este link de convite foi revogado.");
        }

        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Este link de convite expirou.");
        }

        User currentUser = securityService.getCurrentUser();

        // Evita que owner entre como participante
        if (link.getTask().getUser().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Você já é o proprietário desta tarefa.");
        }

        // Verifica se já é participante
        return participantRepository.findByTaskIdAndUserId(link.getTask().getId(), currentUser.getId())
                .orElseGet(() -> {
                    TaskParticipant newParticipant = TaskParticipant.builder()
                            .task(link.getTask())
                            .user(currentUser)
                            .role(link.getRoleGranted())
                            .build();
                    
                    TaskParticipant saved = participantRepository.save(newParticipant);
                    
                    // Notifica em tempo real
                    sseService.broadcastToTask(link.getTask().getId(), "USER_JOINED_TASK", 
                        currentUser.getName() + " ingressou na tarefa.");
                        
                    return saved;
                });
    }

    @Transactional
    public void removeParticipant(Long taskId, Long participantUserId) {
        User currentUser = securityService.getCurrentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));

        // Se o current user não for owner, nem admin, não pode remover.
        // Já está coberto pelo @PreAuthorize no Controller, mas validamos:
        if (!task.getUser().getId().equals(currentUser.getId()) && !currentUser.getId().equals(participantUserId)) {
            // Se eu não sou owner e não estou tentando remover a mim mesmo: erro.
            throw new UnauthorizedException("Sem permissão para remover participantes.");
        }

        participantRepository.deleteByTaskIdAndUserId(taskId, participantUserId);

        // Notifica em tempo real
        sseService.broadcastToTask(taskId, "USER_LEFT_TASK", "Um usuário saiu da tarefa.");
    }

    @Transactional(readOnly = true)
    public List<TaskParticipant> getParticipants(Long taskId) {
        return participantRepository.findByTaskId(taskId);
    }

    @Transactional
    public Task updatePrivacy(Long taskId, Task.TaskPrivacy privacy) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));
        
        task.setPrivacyMode(privacy);
        Task updated = taskRepository.save(task);

        sseService.broadcastToTask(taskId, "TASK_UPDATED", "Privacidade da tarefa alterada.");

        return updated;
    }
}
