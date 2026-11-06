package com.taskmanager.service;

import com.taskmanager.entity.Task;
import com.taskmanager.entity.User;
import com.taskmanager.repository.TaskParticipantRepository;
import com.taskmanager.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RealTimeSseServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private TaskParticipantRepository participantRepository;
    @InjectMocks private RealTimeSseService service;

    @Test
    void deadConnectionDoesNotBreakTheOperationThatTriggeredTheEvent() {
        User owner = User.builder().id(1L).build();
        when(taskRepository.findById(10L)).thenReturn(Optional.of(Task.builder().id(10L).user(owner).build()));
        when(participantRepository.findByTaskId(10L)).thenReturn(List.of());

        // Aba fechada: o emitter continua registrado, mas enviar nele lança IllegalStateException
        SseEmitter closedTab = service.subscribe(1L);
        closedTab.complete();

        assertThatCode(() -> service.broadcastToTask(10L, "TASK_UPDATED", "dados")).doesNotThrowAnyException();
        // A conexão morta foi descartada: o próximo evento nem tenta usá-la
        assertThatCode(() -> service.notifyUser(1L, "NEW_NOTIFICATION", "dados")).doesNotThrowAnyException();
    }
}
