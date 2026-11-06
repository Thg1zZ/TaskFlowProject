package com.taskmanager.integration;

import com.taskmanager.entity.ParticipantRole;
import com.taskmanager.entity.PasswordResetToken;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.TaskParticipant;
import com.taskmanager.entity.User;
import com.taskmanager.entity.UserRole;
import com.taskmanager.repository.NotificationRepository;
import com.taskmanager.repository.PasswordResetTokenRepository;
import com.taskmanager.repository.TaskParticipantRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.JwtTokenProvider;
import com.taskmanager.util.HashUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Sobe a aplicação inteira contra um PostgreSQL real (migrations V1..V8 + validate do Hibernate)
 * e cobre as regras de segurança da API. É ignorado quando não há Docker disponível.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "JWT_SECRET=integration-test-secret-with-more-than-32-chars",
        "DB_PASSWORD=unused",
        "JPA_DDL_AUTO=validate"
})
@AutoConfigureMockMvc
class ApiSecurityIntegrationTest {

    private static final String PASSWORD = "Senha!Forte123";

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private TaskRepository tasks;
    @Autowired private TaskParticipantRepository participants;
    @Autowired private NotificationRepository notifications;
    @Autowired private PasswordResetTokenRepository resetTokens;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwt;

    // ─── helpers ────────────────────────────────────────────────────────────

    private User createUser(UserRole role) {
        return users.save(User.builder()
                .name("User " + role)
                .email(UUID.randomUUID() + "@example.com")
                .password(passwordEncoder.encode(PASSWORD))
                .role(role)
                .build());
    }

    private Task createTask(User owner) {
        return tasks.save(Task.builder().title("Tarefa secreta").user(owner).build());
    }

    private String tokenFor(User user) {
        return jwt.generateToken(user.getEmail());
    }

    private ResultActions call(MockHttpServletRequestBuilder request, String token) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + token));
    }

    private ResultActions callJson(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
        return call(request.contentType(MediaType.APPLICATION_JSON).content(body), token);
    }

    /** O "iat" do JWT tem precisão de segundos: garante que a troca de senha caia num segundo posterior. */
    private static void waitNextSecond() throws InterruptedException {
        Thread.sleep(1100);
    }

    // ─── autenticação e autorização ─────────────────────────────────────────

    @Test
    void requestWithoutSessionReturns401() throws Exception {
        mvc.perform(get("/api/tasks")).andExpect(status().isUnauthorized());
    }

    @Test
    void readingAnotherUsersTaskReturns403() throws Exception {
        Task task = createTask(createUser(UserRole.ROLE_USER));
        User stranger = createUser(UserRole.ROLE_USER);

        call(get("/api/tasks/{id}", task.getId()), tokenFor(stranger)).andExpect(status().isForbidden());
    }

    @Test
    void removeParticipantDoesNotLeakTaskTitle() throws Exception {
        Task task = createTask(createUser(UserRole.ROLE_USER));
        User stranger = createUser(UserRole.ROLE_USER);

        call(delete("/api/tasks/{id}/participants/{userId}", task.getId(), stranger.getId()), tokenFor(stranger))
                .andExpect(status().isNotFound());
        assertThat(notifications.countByUserIdAndIsReadFalse(stranger.getId())).isZero();
    }

    @Test
    void adminCannotManageAnotherAdminAndUserCannotReachAdminArea() throws Exception {
        User admin = createUser(UserRole.ROLE_ADMIN);
        User otherAdmin = createUser(UserRole.ROLE_ADMIN);
        User regular = createUser(UserRole.ROLE_USER);

        call(delete("/api/admin/users/{id}", otherAdmin.getId()), tokenFor(admin)).andExpect(status().isBadRequest());
        assertThat(users.findById(otherAdmin.getId())).isPresent();
        call(get("/api/admin/users"), tokenFor(regular)).andExpect(status().isForbidden());
    }

    // ─── sessões ────────────────────────────────────────────────────────────

    @Test
    void passwordChangeInvalidatesOtherSessions() throws Exception {
        User user = createUser(UserRole.ROLE_USER);
        String sessionA = tokenFor(user);
        String sessionB = tokenFor(user);
        waitNextSecond();

        callJson(post("/api/users/me/password"), sessionA,
                "{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"NovaSenha!456\"}")
                .andExpect(status().isOk());

        call(get("/api/users/me"), sessionB).andExpect(status().isUnauthorized());
        call(get("/api/users/me"), tokenFor(user)).andExpect(status().isOk());
    }

    @Test
    void passwordResetInvalidatesSessionsAndTokenIsSingleUse() throws Exception {
        User user = createUser(UserRole.ROLE_USER);
        String oldSession = tokenFor(user);
        String rawToken = UUID.randomUUID().toString();
        resetTokens.save(PasswordResetToken.builder()
                .tokenHash(HashUtils.sha256Hex(rawToken))
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(30))
                .build());
        waitNextSecond();

        String body = "{\"token\":\"" + rawToken + "\",\"newPassword\":\"Redefinida!789\"}";
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        call(get("/api/users/me"), oldSession).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/reset-password").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    // ─── dados expostos ─────────────────────────────────────────────────────

    @Test
    void profileUpdateKeepsFieldsNotSent() throws Exception {
        User user = createUser(UserRole.ROLE_USER);
        user.setProfileImage("data:image/jpeg;base64,QUJD");
        user.setBio("minha bio");
        users.save(user);

        callJson(put("/api/users/me"), tokenFor(user), "{\"name\":\"Nome Novo\"}").andExpect(status().isOk());

        call(get("/api/users/me"), tokenFor(user))
                .andExpect(jsonPath("$.name").value("Nome Novo"))
                .andExpect(jsonPath("$.profileImage").value("data:image/jpeg;base64,QUJD"))
                .andExpect(jsonPath("$.bio").value("minha bio"));
    }

    @Test
    void participantsListDoesNotExposeEmails() throws Exception {
        User owner = createUser(UserRole.ROLE_USER);
        User member = createUser(UserRole.ROLE_USER);
        Task task = createTask(owner);
        participants.save(TaskParticipant.builder().task(task).user(member).role(ParticipantRole.EDITOR).build());

        call(get("/api/tasks/{id}/participants", task.getId()), tokenFor(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].user.name").value(member.getName()))
                .andExpect(jsonPath("$[0].role").value("EDITOR"))
                .andExpect(jsonPath("$[0].user.email").doesNotExist());
    }
}
