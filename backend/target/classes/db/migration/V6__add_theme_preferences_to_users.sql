-- V6: Adiciona coluna de preferências de tema na tabela de usuários

ALTER TABLE users 
ADD COLUMN theme_preferences TEXT;
