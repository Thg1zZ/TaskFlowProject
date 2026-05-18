package com.taskmanager.service;

import com.taskmanager.exception.EmailDeliveryException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendPasswordResetEmail(String to, String resetLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Redefina sua senha - TaskFlow");
            
            String htmlContent = "<html>" +
                "<body style='font-family: sans-serif; background-color: #09090b; padding: 40px; color: #ffffff;'>" +
                "  <div style='max-width: 500px; margin: 0 auto; background-color: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;'>" +
                "    <div style='font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 24px;'>⬡ TaskFlow</div>" +
                "    <h2 style='font-size: 20px; margin-bottom: 16px;'>Solicitação de Nova Senha</h2>" +
                "    <p style='color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;'>Olá! Recebemos um pedido para redefinir a senha da sua conta. Se foi você, clique no botão abaixo para prosseguir:</p>" +
                "    <a href='" + resetLink + "' style='display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;'>Redefinir Minha Senha</a>" +
                "    <p style='font-size: 13px; color: #71717a;'>Se o botão não funcionar, copie e cole este link no seu navegador:<br>" + resetLink + "</p>" +
                "    <hr style='border: 0; border-top: 1px solid #27272a; margin: 24px 0;'>" +
                "    <p style='font-size: 12px; color: #52525b;'>Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.</p>" +
                "  </div>" +
                "</body>" +
                "</html>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            // [VULN-04] EmailDeliveryException é capturada pelo handler genérico
            // e retorna "Erro interno" ao cliente — sem vazar detalhes SMTP.
            throw new EmailDeliveryException("Erro ao disparar e-mail de recuperação", e);
        }
    }
}
