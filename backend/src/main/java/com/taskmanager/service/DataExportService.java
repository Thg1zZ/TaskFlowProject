package com.taskmanager.service;

import com.taskmanager.dto.TaskResponse;
import com.taskmanager.dto.UserDataExport;
import com.taskmanager.entity.User;
import com.taskmanager.repository.CategoryRepository;
import com.taskmanager.repository.NotificationRepository;
import com.taskmanager.repository.ShareLinkRepository;
import com.taskmanager.repository.TaskCommentRepository;
import com.taskmanager.repository.TaskParticipantRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserAccessLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** [LGPD art. 18, II] Direito de acesso: reúne os dados do usuário logado. */
@Service
@RequiredArgsConstructor
public class DataExportService {

    private final SecurityService securityService;
    private final TaskRepository taskRepository;
    private final CategoryRepository categoryRepository;
    private final TaskCommentRepository commentRepository;
    private final NotificationRepository notificationRepository;
    private final UserAccessLogRepository accessLogRepository;
    private final TaskParticipantRepository participantRepository;
    private final ShareLinkRepository shareLinkRepository;

    @Transactional(readOnly = true)
    public UserDataExport exportCurrentUser() {
        User u = securityService.getCurrentUser();

        return new UserDataExport(
                LocalDateTime.now(),
                new UserDataExport.Profile(u.getId(), u.getName(), u.getEmail(), u.getBio(), u.getJobTitle(),
                        u.getRole().name(), u.getCreatedAt(), u.getEmailVerified(), u.getAcceptedTerms(),
                        u.getAcceptedAt(), u.getTermsVersion(), u.getReceiveNotifications(), u.getProfileImage()),
                taskRepository.findAllOwnedBy(u.getId()).stream().map(TaskResponse::fromEntity).toList(),
                participantRepository.findByUserId(u.getId()).stream()
                        .map(p -> new UserDataExport.SharedTaskData(p.getTask().getId(), p.getTask().getTitle(),
                                p.getRole().name(), p.getJoinedAt()))
                        .toList(),
                shareLinkRepository.findByCreatedById(u.getId()).stream()
                        .map(l -> new UserDataExport.ShareLinkData(l.getTask().getId(), l.getRoleGranted().name(),
                                l.getCreatedAt(), l.getExpiresAt(), l.getIsActive()))
                        .toList(),
                categoryRepository.findByUserIdOrderByNameAsc(u.getId()).stream()
                        .map(c -> new UserDataExport.CategoryData(c.getName(), c.getColor(), c.getIcon(), c.getCreatedAt()))
                        .toList(),
                commentRepository.findByUserIdOrderByCreatedAtAsc(u.getId()).stream()
                        .map(c -> new UserDataExport.CommentData(c.getTask().getId(), c.getContent(), c.getCreatedAt()))
                        .toList(),
                notificationRepository.findByUserIdOrderByCreatedAtDesc(u.getId()).stream()
                        .map(n -> new UserDataExport.NotificationData(n.getType(), n.getMessage(), n.getIsRead(), n.getCreatedAt()))
                        .toList(),
                accessLogRepository.findByUserIdOrderByAccessedAtDesc(u.getId()).stream()
                        .map(a -> a.getAccessedAt())
                        .toList());
    }
}
