-- V1: Schema base (estado anterior à V2)

CREATE TABLE users (
    id            BIGSERIAL    PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    bio           VARCHAR(200),
    job_title     VARCHAR(50),
    profile_image TEXT,
    role          VARCHAR(30)  NOT NULL DEFAULT 'ROLE_USER',
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id         BIGSERIAL   PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    color      VARCHAR(7),
    icon       VARCHAR(50),
    created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_category_name_user UNIQUE (name, user_id)
);
CREATE INDEX idx_categories_user_id ON categories(user_id);

CREATE TABLE tasks (
    id                 BIGSERIAL    PRIMARY KEY,
    title              VARCHAR(200) NOT NULL,
    description        TEXT,
    status             VARCHAR(20)  NOT NULL DEFAULT 'TODO',
    priority           VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    due_date           DATE,
    start_date         DATE,
    end_date           DATE,
    estimated_minutes  INTEGER,
    time_spent_minutes INTEGER      DEFAULT 0,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP,
    user_id            BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id        BIGINT       REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX idx_tasks_user_id     ON tasks(user_id);
CREATE INDEX idx_tasks_category_id ON tasks(category_id);

CREATE TABLE task_comments (
    id         BIGSERIAL PRIMARY KEY,
    content    TEXT      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    task_id    BIGINT    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    BIGINT    NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

CREATE TABLE password_reset_tokens (
    id          BIGSERIAL   PRIMARY KEY,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expiry_date TIMESTAMP   NOT NULL
);
CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
