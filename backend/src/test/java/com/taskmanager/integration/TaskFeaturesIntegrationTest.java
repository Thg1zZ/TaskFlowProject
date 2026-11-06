package com.taskmanager.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskmanager.entity.User;
import com.taskmanager.entity.UserRole;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Subtarefas, etiquetas e recorrência, exercitadas pela API contra um PostgreSQL real. */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
        "JWT_SECRET=integration-test-secret-with-more-than-32-chars",
        "DB_PASSWORD=unused",
        "JPA_DDL_AUTO=validate"
})
@AutoConfigureMockMvc
class TaskFeaturesIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private JwtTokenProvider jwt;
    @Autowired private ObjectMapper json;

    private String newUserToken() {
        User user = users.save(User.builder()
                .name("Tester")
                .email(UUID.randomUUID() + "@example.com")
                .password("x")
                .role(UserRole.ROLE_USER)
                .build());
        return jwt.generateToken(user.getEmail());
    }

    private JsonNode send(MockHttpServletRequestBuilder request, String token, String body, int expectedStatus) throws Exception {
        ResultActions result = mvc.perform(request.header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body == null ? "" : body));
        String content = result.andExpect(status().is(expectedStatus)).andReturn().getResponse().getContentAsString();
        return content.isEmpty() ? null : json.readTree(content);
    }

    private List<JsonNode> tasksTitled(String token, String title) throws Exception {
        JsonNode all = send(get("/api/tasks"), token, null, 200);
        return StreamSupport.stream(all.spliterator(), false)
                .filter(t -> t.get("title").asText().equals(title))
                .toList();
    }

    @Test
    void createsTaskWithNormalizedTagsAndOrderedSubtasks() throws Exception {
        JsonNode task = send(post("/api/tasks"), newUserToken(), """
                {"title":"Lançar versão","tags":["Frontend"," URGENTE ","#frontend","#Backend"],
                 "subtasks":[{"title":"Escrever testes"},{"title":"Revisar PR","done":true}]}""", 201);

        assertThat(task.get("tags")).extracting(JsonNode::asText).containsExactly("backend", "frontend", "urgente");
        assertThat(task.get("subtasks")).hasSize(2);
        assertThat(task.get("subtasks").get(0).get("title").asText()).isEqualTo("Escrever testes");
        assertThat(task.get("subtasks").get(1).get("done").asBoolean()).isTrue();
    }

    @Test
    void rejectsMoreThanFiveTags() throws Exception {
        send(post("/api/tasks"), newUserToken(), """
                {"title":"Muitas tags","tags":["a","b","c","d","e","f"]}""", 400);
    }

    @Test
    void togglesSubtaskAndBlocksOtherUsers() throws Exception {
        String owner = newUserToken();
        JsonNode task = send(post("/api/tasks"), owner, """
                {"title":"Checklist","subtasks":[{"title":"Item"}]}""", 201);
        long taskId = task.get("id").asLong();
        long subtaskId = task.get("subtasks").get(0).get("id").asLong();

        JsonNode toggled = send(patch("/api/tasks/{id}/subtasks/{sid}", taskId, subtaskId), owner, "{\"done\":true}", 200);
        assertThat(toggled.get("subtasks").get(0).get("done").asBoolean()).isTrue();

        send(patch("/api/tasks/{id}/subtasks/{sid}", taskId, subtaskId), newUserToken(), "{\"done\":false}", 403);
    }

    @Test
    void updateKeepsExistingSubtaskIdsAndRemovesMissingOnes() throws Exception {
        String owner = newUserToken();
        JsonNode task = send(post("/api/tasks"), owner, """
                {"title":"Editar","subtasks":[{"title":"Fica"},{"title":"Sai"}]}""", 201);
        long keptId = task.get("subtasks").get(0).get("id").asLong();

        JsonNode updated = send(put("/api/tasks/{id}", task.get("id").asLong()), owner,
                "{\"title\":\"Editar\",\"subtasks\":[{\"id\":" + keptId + ",\"title\":\"Fica\",\"done\":true},{\"title\":\"Nova\"}]}", 200);

        assertThat(updated.get("subtasks")).hasSize(2);
        assertThat(updated.get("subtasks").get(0).get("id").asLong()).isEqualTo(keptId);
        assertThat(updated.get("subtasks").get(1).get("title").asText()).isEqualTo("Nova");
    }

    @Test
    void completingRecurringTaskCreatesNextOccurrenceOnlyOnce() throws Exception {
        String owner = newUserToken();
        LocalDate due = LocalDate.now().plusDays(2);
        JsonNode task = send(post("/api/tasks"), owner, """
                {"title":"Relatório semanal","recurrence":"WEEKLY","endDate":"%s","tags":["rotina"],
                 "subtasks":[{"title":"Coletar dados","done":true}]}""".formatted(due), 201);
        long id = task.get("id").asLong();

        JsonNode done = send(patch("/api/tasks/{id}/status", id), owner, "{\"status\":\"DONE\"}", 200);
        assertThat(done.get("recurrence").isNull()).isTrue();

        // Desmarcar e marcar de novo não pode gerar uma segunda ocorrência
        send(patch("/api/tasks/{id}/status", id), owner, "{\"status\":\"TODO\"}", 200);
        send(patch("/api/tasks/{id}/status", id), owner, "{\"status\":\"DONE\"}", 200);

        List<JsonNode> occurrences = tasksTitled(owner, "Relatório semanal");
        assertThat(occurrences).hasSize(2);
        JsonNode next = occurrences.stream().filter(t -> t.get("id").asLong() != id).findFirst().orElseThrow();
        assertThat(next.get("status").asText()).isEqualTo("TODO");
        assertThat(next.get("endDate").asText()).isEqualTo(due.plusWeeks(1).toString());
        assertThat(next.get("recurrence").asText()).isEqualTo("WEEKLY");
        assertThat(next.get("tags").get(0).asText()).isEqualTo("rotina");
        assertThat(next.get("subtasks").get(0).get("done").asBoolean()).isFalse();
    }

    @Test
    void lateCompletionSchedulesNextOccurrenceFromToday() throws Exception {
        String owner = newUserToken();
        JsonNode task = send(post("/api/tasks"), owner, """
                {"title":"Regar plantas","recurrence":"DAILY","endDate":"%s"}""".formatted(LocalDate.now().minusDays(5)), 201);

        send(patch("/api/tasks/{id}/status", task.get("id").asLong()), owner, "{\"status\":\"DONE\"}", 200);

        JsonNode next = tasksTitled(owner, "Regar plantas").stream()
                .filter(t -> t.get("status").asText().equals("TODO")).findFirst().orElseThrow();
        assertThat(next.get("endDate").asText()).isEqualTo(LocalDate.now().toString());
    }
}
