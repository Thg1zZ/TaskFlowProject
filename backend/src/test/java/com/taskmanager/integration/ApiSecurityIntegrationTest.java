package com.taskmanager.integration;

import com.taskmanager.entity.ParticipantRole;
import com.taskmanager.entity.PasswordResetToken;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.TaskParticipant;
import com.taskmanager.entity.User;
import com.taskmanager.entity.UserRole;
import com.taskmanager.repository.BlacklistedEmailRepository;
import com.taskmanager.repository.NotificationRepository;
import com.taskmanager.repository.PasswordResetTokenRepository;
import com.taskmanager.repository.TaskParticipantRepository;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.JwtTokenProvider;
import com.taskmanager.service.DataRetentionJob;
import com.taskmanager.util.HashUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
    @Autowired private BlacklistedEmailRepository blacklist;
    @Autowired private DataRetentionJob retentionJob;
    @Autowired private JdbcTemplate jdbc;

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

    // ─── LGPD e operação ────────────────────────────────────────────────────

    @Test
    void dataExportReturnsOwnDataWithoutCredentials() throws Exception {
        User user = createUser(UserRole.ROLE_USER);
        createTask(user);

        String body = call(get("/api/users/me/export"), tokenFor(user))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("attachment")))
                .andExpect(jsonPath("$.profile.email").value(user.getEmail()))
                .andExpect(jsonPath("$.tasks[0].title").value("Tarefa secreta"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain(user.getPassword()).doesNotContain("\"password\"");
    }

    @Test
    void healthCheckIsPublicAndHidesDetails() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
    }

    @Test
    void deletedAccountKeepsOnlyEmailHashAndBlocksReRegistration() throws Exception {
        User user = createUser(UserRole.ROLE_USER);

        callJson(delete("/api/users/me"), tokenFor(user), "{\"password\":\"" + PASSWORD + "\"}").andExpect(status().isOk());

        assertThat(blacklist.existsByEmailHash(HashUtils.emailHash(user.getEmail()))).isTrue();
        assertThat(jdbc.queryForObject("select count(*) from information_schema.columns "
                + "where table_name = 'blacklisted_emails' and column_name = 'email'", Integer.class)).isZero();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(
                        "{\"name\":\"Outra\",\"email\":\"" + user.getEmail() + "\",\"password\":\"" + PASSWORD + "\",\"acceptedTerms\":true}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void apiMessagesFollowAcceptLanguage() throws Exception {
        String token = tokenFor(createUser(UserRole.ROLE_USER));
        String body = "{\"currentPassword\":\"Errada!123x\",\"newPassword\":\"NovaSenha!456\"}";

        call(post("/api/users/me/password").contentType(MediaType.APPLICATION_JSON).content(body)
                .header("Accept-Language", "en-US"), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Current password is incorrect"));

        call(post("/api/users/me/password").contentType(MediaType.APPLICATION_JSON).content(body)
                .header("Accept-Language", "pt-BR"), token)
                .andExpect(jsonPath("$.error").value("Senha atual incorreta"));

        callJson(post("/api/tasks").header("Accept-Language", "en"), token, "{\"title\":\"\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid data"))
                .andExpect(jsonPath("$.details.title").value("Title is required"));

        // Idioma não suportado cai no português, nunca no idioma do servidor
        callJson(post("/api/tasks").header("Accept-Language", "de-DE"), token, "{\"title\":\"\"}")
                .andExpect(jsonPath("$.details.title").value("Título é obrigatório"));
    }

    @Test
    void javaEmailHashMatchesMigrationFormula() {
        String email = "  Pessoa.Teste@Example.COM ";
        String sqlHash = jdbc.queryForObject(
                "select encode(sha256(convert_to(lower(trim(?)), 'UTF8')), 'hex')", String.class, email);
        assertThat(HashUtils.emailHash(email)).isEqualTo(sqlHash);
    }

    @Test
    void retentionJobPurgesOnlyExpiredAccessLogs() {
        User user = createUser(UserRole.ROLE_USER);
        jdbc.update("insert into user_access_logs (user_id, accessed_at) values (?, now() - interval '200 days')", user.getId());
        jdbc.update("insert into user_access_logs (user_id, accessed_at) values (?, now())", user.getId());

        retentionJob.purgeExpiredData();

        assertThat(jdbc.queryForObject("select count(*) from user_access_logs where user_id = ?", Integer.class, user.getId()))
                .isEqualTo(1);
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

    @Test
    void googleAccountConfirmsDeletionWithOwnEmail() throws Exception {
        User google = createUser(UserRole.ROLE_USER);
        google.setEmailVerified(true);
        users.save(google);
        String token = tokenFor(google);

        callJson(delete("/api/users/me"), token, "{\"confirmEmail\":\"outra@pessoa.com\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("O e-mail digitado não corresponde ao da sua conta."));
        callJson(delete("/api/users/me"), token, "{\"confirmEmail\":\" " + google.getEmail().toUpperCase() + " \"}")
                .andExpect(status().isOk());
        assertThat(users.findById(google.getId())).isEmpty();
    }

    @Test
    void passwordAccountCannotDeleteWithEmailOnly() throws Exception {
        User user = createUser(UserRole.ROLE_USER);

        callJson(delete("/api/users/me"), tokenFor(user), "{\"confirmEmail\":\"" + user.getEmail() + "\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Senha atual incorreta"));
        assertThat(users.findById(user.getId())).isPresent();
    }

    @Test
    void accountDeletionAnonymizesAuditLog() throws Exception {
        User user = createUser(UserRole.ROLE_USER);
        String auditInsert = "insert into admin_audit_logs (admin_id, admin_email, admin_role, target_user_id, "
                + "target_user_email, action, details, result, performed_at) values (?, ?, 'ROLE_ADMIN', ?, ?, ?, ?, 'SUCCESS', now())";
        jdbc.update(auditInsert, 999_001L, "admin@taskflow.test", user.getId(), user.getEmail(),
                "CHANGE_EMAIL", "E-mail alterado: [antigo@x.com] → [" + user.getEmail() + "]");
        jdbc.update(auditInsert, 999_001L, "admin@taskflow.test", user.getId(), user.getEmail(), "CHANGE_ROLE", "Role alterada");

        callJson(delete("/api/users/me"), tokenFor(user), "{\"password\":\"" + PASSWORD + "\"}").andExpect(status().isOk());

        assertThat(jdbc.queryForList("select target_user_email from admin_audit_logs where target_user_id = ?", String.class, user.getId()))
                .hasSize(2).containsOnly("[conta excluída]");
        assertThat(jdbc.queryForObject("select details from admin_audit_logs where target_user_id = ? and action = 'CHANGE_EMAIL'",
                String.class, user.getId())).isNull();
        assertThat(jdbc.queryForObject("select details from admin_audit_logs where target_user_id = ? and action = 'CHANGE_ROLE'",
                String.class, user.getId())).isEqualTo("Role alterada");
    }

    @Test
    void retentionJobPurgesOldAuditLogsAndBlacklistHashes() {
        String auditInsert = "insert into admin_audit_logs (admin_id, admin_email, admin_role, action, result, performed_at) "
                + "values (999002, 'retencao@taskflow.test', 'ROLE_ADMIN', 'GET_STATS', 'SUCCESS', now() - make_interval(days => ?))";
        jdbc.update(auditInsert, 800);
        jdbc.update(auditInsert, 10);
        String blacklistInsert = "insert into blacklisted_emails (email_hash, deleted_at) values (?, now() - make_interval(days => ?))";
        jdbc.update(blacklistInsert, HashUtils.emailHash("antigo-" + UUID.randomUUID() + "@x.com"), 800);
        String recentHash = HashUtils.emailHash("recente-" + UUID.randomUUID() + "@x.com");
        jdbc.update(blacklistInsert, recentHash, 10);

        retentionJob.purgeExpiredData();

        assertThat(jdbc.queryForObject("select count(*) from admin_audit_logs where admin_id = 999002", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from blacklisted_emails where deleted_at < now() - interval '730 days'",
                Integer.class)).isZero();
        assertThat(blacklist.existsByEmailHash(recentHash)).isTrue();
    }

    @Test
    void dataExportIncludesTasksSharedWithUser() throws Exception {
        User owner = createUser(UserRole.ROLE_USER);
        User member = createUser(UserRole.ROLE_USER);
        Task task = createTask(owner);
        participants.save(TaskParticipant.builder().task(task).user(member).role(ParticipantRole.EDITOR).build());

        call(get("/api/users/me/export"), tokenFor(member))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sharedWithMe[0].taskId").value(task.getId()))
                .andExpect(jsonPath("$.sharedWithMe[0].role").value("EDITOR"))
                .andExpect(jsonPath("$.shareLinks").isArray());
    }
}
