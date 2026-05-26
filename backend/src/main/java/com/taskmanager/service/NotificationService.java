package com.taskmanager.service;

import com.taskmanager.entity.Notification;
import com.taskmanager.entity.User;
import com.taskmanager.repository.NotificationRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.SecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SecurityService securityService;
    private final RealTimeSseService sseService;

    @Transactional
    public void createNotification(Long userId, String type, String message, String actionUrl) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .message(message)
                .actionUrl(actionUrl)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Dispara o evento SSE de nova notificação para o usuário específico
        sseService.notifyUser(userId, "NEW_NOTIFICATION", saved);
    }

    @Transactional(readOnly = true)
    public List<Notification> getMyNotifications() {
        Long userId = securityService.getCurrentUserId();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void markAllAsRead() {
        Long userId = securityService.getCurrentUserId();
        notificationRepository.markAllAsRead(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(securityService.getCurrentUserId())) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        Long userId = securityService.getCurrentUserId();
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
}
