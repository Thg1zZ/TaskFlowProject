package com.taskmanager.service;

import com.taskmanager.dto.ParticipantResponse;
import com.taskmanager.entity.*;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.exception.UnauthorizedException;
import com.taskmanager.repository.ShareLinkRepository;
import com.taskmanager.repository.TaskParticipantRepository;
import com.taskmanager.repository.TaskRepository;
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
    private final SecurityService securityService;
    private final RealTimeSseService sseService;
    private final NotificationService notificationService;

    @Transactional
    public ShareLink generateShareLink(Long taskId, ParticipantRole role, Integer expireInHours) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("error.task.notFound"));

        // Desativa links anteriores para mesma tarefa (opcional - no nosso caso
        // deixamos criar multiplos ou invalidamos o ativo)
        List<ShareLink> activeLinks = shareLinkRepository.findByTaskIdAndIsActiveTrue(taskId);
        for (ShareLink activeLink : activeLinks) {
            activeLink.setIsActive(false);
        }
        shareLinkRepository.saveAll(activeLinks);

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
    public ParticipantResponse joinViaLink(UUID token) {
        ShareLink link = shareLinkRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("error.invite.notFound"));

        if (!link.getIsActive()) {
            throw new UnauthorizedException("error.invite.revoked");
        }

        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("error.invite.expired");
        }

        User currentUser = securityService.getCurrentUser();

        // Evita que owner entre como participante
        if (link.getTask().getUser().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("error.invite.alreadyOwner");
        }

        // Verifica se já é participante
        TaskParticipant participant = participantRepository.findByTaskIdAndUserId(link.getTask().getId(), currentUser.getId())
                .orElseGet(() -> {
                    TaskParticipant newParticipant = TaskParticipant.builder()
                            .task(link.getTask())
                            .user(currentUser)
                            .role(link.getRoleGranted())
                            .build();

                    TaskParticipant saved = participantRepository.save(newParticipant);

                    // Notifica em tempo real (SSE)
                    sseService.broadcastToTask(link.getTask().getId(), "USER_JOINED_TASK",
                            currentUser.getName() + " ingressou na tarefa.");

                    // Cria notificação no banco de dados para o Dono da tarefa
                    notificationService.createNotification(
                            link.getTask().getUser().getId(),
                            "COLLABORATION",
                            currentUser.getName() + " aceitou o convite e ingressou na tarefa: "
                                    + link.getTask().getTitle(),
                            "/dashboard/tasks");

                    return saved;
                });
        return ParticipantResponse.fromEntity(participant);
    }

    @Transactional
    public void removeParticipant(Long taskId, Long participantUserId) {
        User currentUser = securityService.getCurrentUser();
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("error.task.notFound"));

        boolean isOwner = task.getUser().getId().equals(currentUser.getId());
        boolean isLeavingParticipant = currentUser.getId().equals(participantUserId)
                && participantRepository.existsByTaskIdAndUserId(taskId, participantUserId);

        // 404 para quem não tem acesso: não revela se a tarefa existe
        if (!isOwner && !isLeavingParticipant) {
            throw new ResourceNotFoundException("error.task.notFound");
        }

        if (participantRepository.deleteByTaskIdAndUserId(taskId, participantUserId) == 0) {
            return;
        }

        // Notifica em tempo real a sala (SSE)
        sseService.broadcastToTask(taskId, "USER_LEFT_TASK", "Um usuário foi removido da tarefa.");

        // Notifica o usuário que foi removido (Banco de Dados + SSE Direto)
        notificationService.createNotification(
                participantUserId,
                "COLLABORATION",
                "Você foi removido da tarefa: " + task.getTitle(),
                "/dashboard");
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> getParticipants(Long taskId) {
        return participantRepository.findByTaskId(taskId).stream()
                .map(ParticipantResponse::fromEntity)
                .toList();
    }

    @Transactional
    public Task updatePrivacy(Long taskId, Task.TaskPrivacy privacy) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("error.task.notFound"));

        task.setPrivacyMode(privacy);
        Task updated = taskRepository.save(task);

        sseService.broadcastToTask(taskId, "TASK_UPDATED", "Privacidade da tarefa alterada.");

        return updated;
    }

    @Transactional
    public void revokeShareLink(Long taskId, Long linkId) {
        ShareLink link = shareLinkRepository.findByIdAndTaskId(linkId, taskId)
                .orElseThrow(() -> new ResourceNotFoundException("error.shareLink.notFound"));

        link.setIsActive(false);
        shareLinkRepository.save(link);

        sseService.broadcastToTask(taskId, "TASK_UPDATED", "Link de convite revogado.");
    }
}
