package com.taskmanager.service;

import com.taskmanager.dto.CommentRequest;
import com.taskmanager.dto.CommentResponse;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.TaskComment;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.TaskCommentRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CommentService {

    @Autowired private TaskCommentRepository commentRepo;
    @Autowired private TaskRepository taskRepo;
    @Autowired private UserRepository userRepo;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    public List<CommentResponse> getByTask(Long taskId) {
        User user = getCurrentUser();
        // Verify task belongs to user
        taskRepo.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));

        return commentRepo.findByTaskIdOrderByCreatedAtAsc(taskId)
                .stream().map(CommentResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public CommentResponse add(Long taskId, CommentRequest req) {
        User user = getCurrentUser();
        Task task = taskRepo.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));

        TaskComment comment = TaskComment.builder()
                .content(req.getContent())
                .task(task)
                .user(user)
                .build();

        return CommentResponse.fromEntity(commentRepo.save(comment));
    }

    @Transactional
    public void delete(Long taskId, Long commentId) {
        User user = getCurrentUser();
        taskRepo.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa não encontrada"));

        TaskComment comment = commentRepo.findByIdAndUserId(commentId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Comentário não encontrado"));

        commentRepo.delete(comment);
    }
}
