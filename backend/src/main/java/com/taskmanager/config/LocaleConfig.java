package com.taskmanager.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

@Configuration
public class LocaleConfig {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    /** Restringe Accept-Language aos idiomas suportados; qualquer outro cai em pt-BR (inclusive mensagens do Bean Validation). */
    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(List.of(PT_BR, Locale.ENGLISH));
        resolver.setDefaultLocale(PT_BR);
        return resolver;
    }
}
