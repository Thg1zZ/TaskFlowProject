package com.taskmanager;

import com.taskmanager.entity.User;
import com.taskmanager.entity.UserRole;
import com.taskmanager.repository.UserRepository;
import com.taskmanager.service.DefaultCategorySeeder;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class TaskManagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskManagerApplication.class, args);
    }

    @org.springframework.beans.factory.annotation.Value("${app.security.allow-demo-users:false}")
    private boolean allowDemoUsers;

    @Bean
    ApplicationRunner ensureDemoAdmin(UserRepository users, PasswordEncoder encoder,
                                      DefaultCategorySeeder defaultCategorySeeder) {
        return args -> {
            if (!allowDemoUsers) {
                return;
            }
            final String demoEmail = "admin@teste.com";
            User admin = users.findByEmailIgnoreCase(demoEmail)
                    .orElseGet(() -> User.builder()
                            .name("Admin Teste")
                            .email(demoEmail)
                            .bio("Usuário de demonstração do TaskFlow")
                            .jobTitle("Desenvolvedor")
                            .role(UserRole.ROLE_ADMIN)
                            .build());

            boolean dirty = false;
            if (!demoEmail.equals(admin.getEmail())) {
                admin.setEmail(demoEmail);
                dirty = true;
            }
            if (admin.getRole() != UserRole.ROLE_ADMIN) {
                admin.setRole(UserRole.ROLE_ADMIN);
                dirty = true;
            }
            if (admin.getPassword() == null || !encoder.matches("senha123", admin.getPassword())) {
                admin.setPassword(encoder.encode("senha123"));
                dirty = true;
            }
            if (admin.getId() == null || dirty) {
                users.save(admin);
            }

            User adminResolved = users.findByEmailIgnoreCase(demoEmail)
                    .orElseThrow(() -> new IllegalStateException("Usuário demo não encontrado após bootstrap"));
            defaultCategorySeeder.seedIfEmpty(adminResolved);
        };
    }
}
