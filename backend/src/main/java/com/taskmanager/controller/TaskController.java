package com.taskmanager.controller;

import com.taskmanager.dto.TaskRequest;
import com.taskmanager.dto.TaskResponse;
import com.taskmanager.dto.TimeTrackingRequest;
import com.taskmanager.dto.UpdateTaskStatusRequest;
import com.taskmanager.entity.Task.TaskStatus;
import com.taskmanager.service.TaskService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAllTasks(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {

        List<TaskResponse> tasks;
        if (search != null && !search.isBlank()) {
            tasks = taskService.searchTasks(search, page, size);
        } else if (status != null) {
            tasks = taskService.getTasksByStatus(status, page, size);
        } else {
            tasks = taskService.getAllTasks(page, size);
        }
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(taskService.getStats());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@taskSecurity.canView(#id)")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.createTask(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@taskSecurity.canEdit(#id)")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id,
                                                   @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.ok(taskService.updateTask(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("@taskSecurity.canEdit(#id)")
    public ResponseEntity<TaskResponse> updateStatus(@PathVariable Long id,
                                                     @Valid @RequestBody UpdateTaskStatusRequest request) {
        return ResponseEntity.ok(taskService.updateTaskStatus(id, request.getStatus()));
    }

    @PatchMapping("/{id}/track-time")
    @PreAuthorize("@taskSecurity.canEdit(#id)")
    public ResponseEntity<TaskResponse> trackTime(@PathVariable Long id,
                                                  @Valid @RequestBody TimeTrackingRequest request) {
        return ResponseEntity.ok(taskService.incrementTaskTime(id, request.getMinutes()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@taskSecurity.canShare(#id)") // Only owner/admin can delete
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
