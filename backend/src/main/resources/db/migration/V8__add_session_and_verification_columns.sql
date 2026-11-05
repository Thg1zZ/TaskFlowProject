-- V8: Invalidação de sessões por troca de senha e verificação de posse do e-mail

ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
