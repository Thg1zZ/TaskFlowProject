package com.taskmanager.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.taskmanager.entity.User;
import com.taskmanager.repository.BlacklistedEmailRepository;
import com.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceGoogleLinkTest {

    private static final String EMAIL = "vitima@gmail.com";

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private BlacklistedEmailRepository blacklistedEmailRepository;
    @Mock private DefaultCategorySeeder defaultCategorySeeder;

    @InjectMocks private AuthService authService;

    private GoogleIdToken.Payload payload;

    @BeforeEach
    void setUp() {
        payload = new GoogleIdToken.Payload();
        payload.setEmail(EMAIL);
        payload.set("name", "Vitima");
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("hash-aleatorio");
        lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void unverifiedAccountLosesPasswordAndSessionsOnFirstGoogleLogin() {
        User planted = User.builder().id(1L).email(EMAIL).password("senha-do-atacante").emailVerified(false).build();
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(planted));

        User result = authService.syncSocialUser(payload);

        assertThat(result.getPassword()).isEqualTo("hash-aleatorio");
        assertThat(result.getEmailVerified()).isTrue();
        assertThat(result.getPasswordChangedAt()).isNotNull();
    }

    @Test
    void verifiedAccountIsLeftUntouched() {
        User owner = User.builder().id(1L).email(EMAIL).password("senha-do-dono").emailVerified(true).build();
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(owner));

        User result = authService.syncSocialUser(payload);

        assertThat(result.getPassword()).isEqualTo("senha-do-dono");
        assertThat(result.getPasswordChangedAt()).isNull();
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void newGoogleAccountIsCreatedAsVerified() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.empty());
        when(blacklistedEmailRepository.existsByEmailIgnoreCase(EMAIL)).thenReturn(false);

        User result = authService.syncSocialUser(payload);

        assertThat(result.getEmailVerified()).isTrue();
        assertThat(result.getName()).isEqualTo("Vitima");
        verify(defaultCategorySeeder).seedForNewUser(result);
    }

    @Test
    void blacklistedEmailCannotBeRecreatedThroughGoogle() {
        when(userRepository.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.empty());
        when(blacklistedEmailRepository.existsByEmailIgnoreCase(EMAIL)).thenReturn(true);

        assertThatThrownBy(() -> authService.syncSocialUser(payload))
                .isInstanceOf(IllegalArgumentException.class);
        verify(userRepository, never()).save(any(User.class));
    }
}
