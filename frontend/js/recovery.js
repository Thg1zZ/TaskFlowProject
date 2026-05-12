const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:8080/api' : 'https://task-manager-with-login.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (targetId) togglePassword(targetId);
        });
    });
});

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const eye   = document.getElementById(inputId + 'Eye');
    if (!input || !eye) return;
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    eye.textContent = isHidden ? '🙈' : '👁';
}

function showAlert(containerId, message, type = 'error') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = message;
    el.className = `alert ${type}`;
    el.classList.remove('hidden');
}

function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => (el.textContent = ''));
    document.querySelectorAll('.field-input').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.alert').forEach(el => el.classList.add('hidden'));
}

function setFieldError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.classList.add('error');
    if (error) error.textContent = message;
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.querySelector('.btn-text')?.classList.toggle('hidden', loading);
    btn.querySelector('.btn-loader')?.classList.toggle('hidden', !loading);
}

// -------------------------------------------------------------
// Fluxo: Forgot Password
// -------------------------------------------------------------
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('recoveryEmail').value.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFieldError('recoveryEmail', 'recoveryEmailError', 'Informe um email válido');
            return;
        }

        setLoading('recoveryBtn', true);
        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            // Sempre mostra sucesso (para evitar enumeração de usuários)
            showAlert('recoveryAlert', 'Se o email existir, um link de recuperação foi enviado.', 'success');
            forgotPasswordForm.reset();
        } catch (err) {
            showAlert('recoveryAlert', 'Erro ao solicitar recuperação. Tente novamente mais tarde.');
        } finally {
            setLoading('recoveryBtn', false);
        }
    });
}

// -------------------------------------------------------------
// Fluxo: Reset Password
// -------------------------------------------------------------
const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
    // Extrai o token da URL (ex: reset_password.html?token=abc)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showAlert('resetAlert', 'Token de recuperação ausente ou inválido.', 'error');
        const btn = document.getElementById('resetBtn');
        if(btn) btn.disabled = true;
    }

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        let valid = true;

        if (!newPassword || newPassword.length < 6) {
            setFieldError('newPassword', 'newPasswordError', 'Senha deve ter no mínimo 6 caracteres');
            valid = false;
        }
        if (newPassword !== confirmPassword) {
            setFieldError('confirmPassword', 'confirmPasswordError', 'As senhas não coincidem');
            valid = false;
        }

        if (!valid || !token) return;

        setLoading('resetBtn', true);
        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Erro ao redefinir a senha');
            }
            
            showAlert('resetAlert', 'Senha atualizada com sucesso! Redirecionando para login...', 'success');
            resetPasswordForm.reset();
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2500);

        } catch (err) {
            showAlert('resetAlert', err.message || 'Erro ao redefinir. O link pode ter expirado.');
        } finally {
            setLoading('resetBtn', false);
        }
    });
}
