-- V9: [LGPD] Contas excluídas deixam de ter o e-mail guardado em texto; fica só o hash SHA-256

ALTER TABLE blacklisted_emails ADD COLUMN email_hash VARCHAR(64);
UPDATE blacklisted_emails SET email_hash = encode(sha256(convert_to(lower(trim(email)), 'UTF8')), 'hex');
ALTER TABLE blacklisted_emails ALTER COLUMN email_hash SET NOT NULL;
ALTER TABLE blacklisted_emails DROP COLUMN email;
CREATE UNIQUE INDEX idx_blacklisted_email_hash ON blacklisted_emails (email_hash);
