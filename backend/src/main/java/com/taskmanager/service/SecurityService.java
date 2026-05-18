package com.taskmanager.service;

import com.taskmanager.entity.User;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Serviço centralizado para obter informações do usuário autenticado no contexto de segurança.
 * Segue o princípio de DRY (Don't Repeat Yourself) de Clean Code e enforca o controle de acesso.
 */
@Service
public class SecurityService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Obtém o usuário atualmente autenticado a partir do SecurityContext do Spring.
     * @return O objeto User correspondente ao usuário logado.
     * @throws ResourceNotFoundException se o usuário não for encontrado no banco de dados.
     */
    public User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + email));
    }
}
