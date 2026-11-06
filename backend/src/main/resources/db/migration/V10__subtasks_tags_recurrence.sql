-- V10: Subtarefas (checklist), etiquetas e recorrência de tarefas

ALTER TABLE tasks ADD COLUMN recurrence VARCHAR(10);  -- DAILY, WEEKLY, MONTHLY ou NULL

CREATE TABLE task_tags (
    task_id BIGINT      NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag     VARCHAR(30) NOT NULL,
    PRIMARY KEY (task_id, tag)
);
CREATE INDEX idx_task_tags_tag ON task_tags(tag);

CREATE TABLE subtasks (
    id       BIGSERIAL    PRIMARY KEY,
    task_id  BIGINT       NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title    VARCHAR(200) NOT NULL,
    done     BOOLEAN      NOT NULL DEFAULT FALSE,
    position INTEGER      NOT NULL
);
CREATE INDEX idx_subtasks_task ON subtasks(task_id);
