package com.taskmanager.security;

import com.taskmanager.repository.UserRepository;
import com.taskmanager.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro JWT — extrai e valida o token em cada requisição.
 *
 * [DUP-01 FIX] A extração do token (cookie → header) foi centralizada em
 * JwtTokenProvider.extractTokenFromRequest(), eliminando a duplicação que existia
 * entre este filtro e UserService.revokeCurrentToken().
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // [DUP-01] Extração centralizada em JwtTokenProvider — single source of truth
            String jwt = tokenProvider.extractTokenFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String email = tokenProvider.getEmailFromToken(jwt);
                // Token emitido antes da última troca de senha é recusado
                userRepository.findByEmailIgnoreCase(email)
                        .filter(user -> tokenProvider.isIssuedAfter(jwt, user.getPasswordChangedAt()))
                        .map(UserDetailsServiceImpl::toUserDetails)
                        .ifPresent(userDetails -> authenticate(userDetails, request));
            }
        } catch (Exception ex) {
            logger.error("Não foi possível definir a autenticação do usuário: {}", ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private void authenticate(UserDetails userDetails, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
