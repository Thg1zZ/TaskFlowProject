package com.taskmanager.entity;

/**
 * [ASVS 4.1] Controle de Acesso Baseado em Perfis (RBAC).
 * Hierarquia de permissões (do menor para o maior nível):
 *   ROLE_USER < ROLE_ADMIN < ROLE_SUPER_ADMIN
 *
 * ROLE_SUPER_ADMIN é o administrador master da plataforma.
 * Sua conta é inviolável: nenhum outro usuário (nem outro admin)
 * pode excluí-la, alterar seu e-mail ou rebaixar sua role.
 */
public enum UserRole {
    ROLE_USER,
    ROLE_ADMIN,
    ROLE_SUPER_ADMIN
}

