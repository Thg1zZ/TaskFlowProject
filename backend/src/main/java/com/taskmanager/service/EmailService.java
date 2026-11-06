package com.taskmanager.service;

import com.taskmanager.exception.EmailDeliveryException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.util.Locale;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Autowired
    private MessageSource messageSource;

    private String text(String key, Locale locale) {
        return messageSource.getMessage(key, null, locale);
    }

    private boolean isMailConfigured() {
        return mailSender != null && mailUsername != null && !mailUsername.isBlank();
    }

    public void sendPasswordResetEmail(String to, String resetLink) {
        if (!isMailConfigured()) {
            log.warn("E-mail não configurado (MAIL_USERNAME/MAIL_PASSWORD ausentes). " +
                     "E-mail de recuperação NÃO enviado para: {}", to);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // E-mail no idioma de quem pediu a redefinição (Accept-Language da requisição)
            Locale locale = LocaleContextHolder.getLocale();
            helper.setFrom(mailFrom.isBlank() ? mailUsername : mailFrom, "TaskFlow");
            helper.setTo(to);
            helper.setSubject(text("email.reset.subject", locale));

            String htmlContent = "<html>" +
                "<body style='font-family: sans-serif; background-color: #09090b; padding: 40px; color: #ffffff;'>" +
                "  <div style='max-width: 500px; margin: 0 auto; background-color: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;'>" +
                "    <div style='font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 24px;'>⬡ TaskFlow</div>" +
                "    <h2 style='font-size: 20px; margin-bottom: 16px;'>" + text("email.reset.title", locale) + "</h2>" +
                "    <p style='color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;'>" + text("email.reset.intro", locale) + "</p>" +
                "    <a href='" + resetLink + "' style='display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;'>" + text("email.reset.button", locale) + "</a>" +
                "    <p style='font-size: 13px; color: #71717a;'>" + text("email.reset.fallback", locale) + "<br>" + resetLink + "</p>" +
                "    <hr style='border: 0; border-top: 1px solid #27272a; margin: 24px 0;'>" +
                "    <p style='font-size: 12px; color: #52525b;'>" + text("email.reset.ignore", locale) + "</p>" +
                "  </div>" +
                "</body>" +
                "</html>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            // MailException cobre falhas de SMTP (autenticação, conexão); detalhes não vão ao cliente
            throw new EmailDeliveryException("Erro ao disparar e-mail de recuperação", e);
        }
    }
}
