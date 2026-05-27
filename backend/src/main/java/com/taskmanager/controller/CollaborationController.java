package com.taskmanager.controller;

import com.taskmanager.entity.ParticipantRole;
import com.taskmanager.entity.ShareLink;
import com.taskmanager.entity.TaskParticipant;
import com.taskmanager.entity.Task;
import com.taskmanager.security.TaskSecurityService;
import com.taskmanager.service.CollaborationService;
import com.taskmanager.service.SecurityService;
import com.taskmanager.service.RealTimeSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CollaborationController {

    private final CollaborationService collaborationService;
    private final RealTimeSseService sseService;
    private final SecurityService securityService;

    // --- REAL-TIME SSE ENDPOINT ---
    
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeStream() {
        Long userId = securityService.getCurrentUserId();
        return sseService.subscribe(userId);
    }

    // --- COLLABORATION ENDPOINTS ---

    @PostMapping("/tasks/{id}/share")
    @PreAuthorize("@taskSecurity.canShare(#id)")
    public ResponseEntity<ShareLink> generateLink(
            @PathVariable Long id,
            @RequestParam(defaultValue = "VIEWER") ParticipantRole role,
            @RequestParam(required = false) Integer expireHours) {
        
        ShareLink link = collaborationService.generateShareLink(id, role, expireHours);
        return ResponseEntity.ok(link);
    }

    @PostMapping("/tasks/join/{token}")
    public ResponseEntity<TaskParticipant> joinTaskViaLink(@PathVariable UUID token) {
        TaskParticipant participant = collaborationService.joinViaLink(token);
        return ResponseEntity.ok(participant);
    }

    @GetMapping("/tasks/{id}/participants")
    @PreAuthorize("@taskSecurity.canView(#id)")
    public ResponseEntity<List<TaskParticipant>> getParticipants(@PathVariable Long id) {
        return ResponseEntity.ok(collaborationService.getParticipants(id));
    }

    @DeleteMapping("/tasks/{id}/participants/{userId}")
    // Permissão verificada dentro do service (Owner/Admin ou a própria pessoa saindo)
    public ResponseEntity<Void> removeParticipant(@PathVariable Long id, @PathVariable Long userId) {
        collaborationService.removeParticipant(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/tasks/{id}/privacy")
    @PreAuthorize("@taskSecurity.canShare(#id)") // Apenas owner/admin
    public ResponseEntity<Void> updatePrivacy(@PathVariable Long id, @RequestParam Task.TaskPrivacy privacy) {
        collaborationService.updatePrivacy(id, privacy);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/tasks/{id}/share-links/{linkId}")
    @PreAuthorize("@taskSecurity.canShare(#id)") // Apenas owner/admin
    public ResponseEntity<Void> revokeShareLink(@PathVariable Long id, @PathVariable Long linkId) {
        collaborationService.revokeShareLink(id, linkId);
        return ResponseEntity.noContent().build();
    }
}
