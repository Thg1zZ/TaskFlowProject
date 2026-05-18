const API_URL = 'https://task-manager-with-login.onrender.com/api';
if (sessionStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnShowRegister')?.addEventListener('click', showRegister);
    document.getElementById('btnShowLogin')?.addEventListener('click', showLogin);
    
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (targetId) togglePassword(targetId);
        });
    });

    // Inicialização programática segura do Google OAuth2
    initializeGoogleOAuth();
});

// --- Alternar cards login / registro ----------------------------

function showRegister() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('registerCard').classList.remove('hidden');
    clearErrors();
}

function showLogin() {
    document.getElementById('registerCard').classList.add('hidden');
    document.getElementById('loginCard').classList.remove('hidden');
    clearErrors();
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const eye   = document.getElementById(inputId + 'Eye');
    if (!input || !eye) return;
    const isHidden = input.type === 'password';
    input.type     = isHidden ? 'text' : 'password';
    eye.textContent = isHidden ? '🙈' : '👁';
}

// --- Alertas e erros de campo -----------------------------------

function showAlert(containerId, message, type = 'error') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = message; // textContent — nunca innerHTML
    el.className = `alert ${type}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
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

// --- Validação --------------------------------------------------

function validateLogin(email, password) {
    let valid = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError('loginEmail', 'loginEmailError', 'Informe um email válido');
        valid = false;
    }
    if (!password) {
        setFieldError('loginPassword', 'loginPasswordError', 'Informe sua senha');
        valid = false;
    }
    return valid;
}

function validateRegister(name, email, password) {
    let valid = true;
    if (!name || name.length < 2) {
        setFieldError('registerName', 'registerNameError', 'Nome deve ter pelo menos 2 caracteres');
        valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError('registerEmail', 'registerEmailError', 'Informe um email válido');
        valid = false;
    }
    if (!password) {
        setFieldError('registerPassword', 'registerPasswordError', 'Senha é obrigatória');
        valid = false;
    } else {
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[^a-zA-Z\d]/.test(password);
        if (password.length < 10) {
            setFieldError('registerPassword', 'registerPasswordError', 'Senha deve ter pelo menos 10 caracteres');
            valid = false;
        } else if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
            setFieldError('registerPassword', 'registerPasswordError', 'Senha deve conter maiúsculas, minúsculas, números e caractere especial');
            valid = false;
        }
    }
    return valid;
}

// --- Chamada de API ---------------------------------------------

async function authPost(endpoint, body) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro inesperado');
    return data;
}

// --- Formulário de login ----------------------------------------

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!validateLogin(email, password)) return;

    setLoading('loginBtn', true);
    try {
        const data = await authPost('/auth/login', { email, password });
        saveSession(data);
        window.location.href = 'dashboard.html';
    } catch (err) {
        // Mensagem genérica — não revelar se é email ou senha incorreto
        showAlert('authAlert', 'Email ou senha inválidos');
    } finally {
        setLoading('loginBtn', false);
    }
});

// --- Formulário de registro -------------------------------------

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name     = document.getElementById('registerName').value.trim();
    const email    = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;

    if (!validateRegister(name, email, password)) return;

    setLoading('registerBtn', true);
    try {
        const data = await authPost('/auth/register', { name, email, password });
        saveSession(data);
        showAlert('registerAlert', 'Conta criada! Redirecionando...', 'success');
        setTimeout(() => (window.location.href = 'dashboard.html'), 1200);
    } catch (err) {
        showAlert('registerAlert', err.message || 'Não foi possível criar a conta');
    } finally {
        setLoading('registerBtn', false);
    }
});

// --- Sessão -----------------------------------------------------

function saveSession(data) {
    sessionStorage.setItem('token',     data.token    || '');
    sessionStorage.setItem('userId',    data.userId   || '');
    sessionStorage.setItem('userName',  data.name     || '');
    sessionStorage.setItem('userEmail', data.email    || '');
    sessionStorage.setItem('userRole',  data.role     || 'ROLE_USER');
    // Remove any leftover localStorage token
    localStorage.removeItem('token');
}

// --- Google Login Callback --------------------------------------
window.handleGoogleLogin = async (response) => {
    clearErrors();
    const alertId = document.getElementById('loginCard').classList.contains('hidden') ? 'registerAlert' : 'authAlert';
    const btnId = document.getElementById('loginCard').classList.contains('hidden') ? 'registerBtn' : 'loginBtn';
    
    setLoading(btnId, true);
    try {
        const nonce = sessionStorage.getItem('oauth_nonce');
        // Envia o ID Token e o Nonce de sessão contra CSRF de forma segura
        const data = await authPost('/auth/google', { 
            idToken: response.credential,
            nonce: nonce
        });
        saveSession(data);
        showAlert(alertId, 'Login efetuado com sucesso! Redirecionando...', 'success');
        setTimeout(() => (window.location.href = 'dashboard.html'), 1000);
    } catch (err) {
        showAlert(alertId, err.message || 'Falha na autenticação com o Google');
    } finally {
        setLoading(btnId, false);
    }
};

// --- Geração Segura de Nonce e Inicialização Programática do GSI ───
function getOrCreateNonce() {
    let nonce = sessionStorage.getItem('oauth_nonce');
    if (!nonce) {
        // Gera um valor de alta entropia criptográfica para mitigar CSRF e Replays
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        nonce = Array.from(array, dec => dec.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem('oauth_nonce', nonce);
    }
    return nonce;
}

function initializeGoogleOAuth() {
    if (typeof google === 'undefined') {
        // Aguarda a carga assíncrona da biblioteca do Google
        setTimeout(initializeGoogleOAuth, 100);
        return;
    }

    const nonce = getOrCreateNonce();
    google.accounts.id.initialize({
        client_id: "1078491873215-placeholder.apps.googleusercontent.com",
        callback: window.handleGoogleLogin,
        nonce: nonce, // Proteção contra CSRF e Replay attacks
        context: "signin",
        ux_mode: "popup",
        auto_prompt: false
    });

    const targets = document.querySelectorAll('.g-signin-target');
    targets.forEach(target => {
        const type = target.getAttribute('data-type');
        google.accounts.id.renderButton(target, {
            type: "standard",
            shape: "rectangular",
            theme: "outline",
            text: type === "signup" ? "signup_with" : "signin_with",
            size: "large",
            logo_alignment: "left",
            width: "100%"
        });
    });
}
