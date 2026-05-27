package com.taskmanager.service;

import com.taskmanager.entity.Task;
import com.taskmanager.entity.TaskParticipant;
import com.taskmanager.repository.TaskParticipantRepository;
import com.taskmanager.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
@RequiredArgsConstructor
public class RealTimeSseService {

    private final TaskRepository taskRepository;
    private final TaskParticipantRepository participantRepository;

    // Mapeamento: userId -> Lista de Emitters
    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Long userId) {
        // Timeout longo: 1 hora
        SseEmitter emitter = new SseEmitter(60L * 60L * 1000L);
        
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError((e) -> removeEmitter(userId, emitter));

        try {
            // Evento de conexão inicial
            emitter.send(SseEmitter.event().name("INIT").data("Connected to Realtime Collaboration"));
        } catch (IOException e) {
            removeEmitter(userId, emitter);
        }

        return emitter;
    }

    private void removeEmitter(Long userId, SseEmitter emitter) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters != null) {
            userEmitters.remove(emitter);
            if (userEmitters.isEmpty()) {
                emitters.remove(userId);
            }
        }
    }

    public void broadcastToTask(Long taskId, String eventName, Object data) {
        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return;

        // Notifica o owner
        notifyUser(task.getUser().getId(), eventName, data);

        // Notifica os participantes
        List<TaskParticipant> participants = participantRepository.findByTaskId(taskId);
        for (TaskParticipant p : participants) {
            notifyUser(p.getUser().getId(), eventName, data);
        }
    }

    public void notifyUser(Long userId, String eventName, Object data) {
        List<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters != null) {
            for (SseEmitter emitter : userEmitters) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(data));
                } catch (IOException e) {
                    emitter.completeWithError(e);
                    removeEmitter(userId, emitter);
                }
            }
        }
    }
}
