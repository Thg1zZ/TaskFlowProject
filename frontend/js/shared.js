// Se estiver rodando localmente (localhost, 127.0.0.1 ou abrindo o arquivo direto no navegador) usa a API local.
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:8080/api' : 'https://task-manager-with-login.onrender.com/api';
const token    = sessionStorage.getItem('token');
const userName = sessionStorage.getItem('userName') || 'Usuário';
const userEmail = sessionStorage.getItem('userEmail') || '';
const userProfileImage = sessionStorage.getItem('userProfileImage') || '';
const userRole = sessionStorage.getItem('userRole') || 'ROLE_USER';

if (!token) window.location.href = 'index.html';

// Guard de Rota Cliente: Impede visualização estrutural da admin.html se não for administrador
(function () {
    const current = window.location.pathname.split('/').pop();
    if (current === 'admin.html' && userRole !== 'ROLE_ADMIN') {
        window.location.href = 'dashboard.html';
    }
})();

// Aplica o tema salvo antes de qualquer render para evitar flash
(function () {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

const NAV_ITEMS = [
    { href: 'dashboard.html',  icon: '◫', label: 'Dashboard'  },
    { href: 'kanban.html',     icon: '⊞', label: 'Kanban'     },
    { href: 'categories.html', icon: '◈', label: 'Categorias' },
    { href: 'profile.html',    icon: '◉', label: 'Perfil'     },
];

function buildSidebar() {
    const nav     = document.getElementById('sidebarNav');
    const current = window.location.pathname.split('/').pop();
    if (!nav) return;

    nav.replaceChildren();
    const items = [...NAV_ITEMS];
    if (userRole === 'ROLE_ADMIN') {
        items.push({ href: 'admin.html', icon: '⚙', label: 'Admin' });
    }

    items.forEach(item => {
        const active = current === item.href;
        const a = document.createElement('a');
        a.href = item.href;
        a.className = 'nav-item' + (active ? ' active' : '');
        
        const spanIcon = document.createElement('span');
        spanIcon.className = 'nav-icon';
        spanIcon.textContent = item.icon;
        
        const spanLabel = document.createElement('span');
        spanLabel.textContent = item.label;
        
        a.appendChild(spanIcon);
        a.appendChild(spanLabel);
        nav.appendChild(a);
    });

    updateThemeBtn();

    const av = document.getElementById('userAvatar');
    if (av) setAvatar(av, userName, userProfileImage);
    const un = document.getElementById('userName');
    if (un) un.textContent = userName;
    const ue = document.getElementById('userEmail');
    if (ue) ue.textContent = userEmail;
}

document.addEventListener('DOMContentLoaded', () => {
    buildSidebar();
    
    // Bind global buttons
    document.querySelectorAll('.btn-logout').forEach(btn => btn.addEventListener('click', logout));
    document.querySelectorAll('.menu-toggle').forEach(btn => btn.addEventListener('click', toggleSidebar));
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
});

// --- API helper -------------------------------------------------

async function apiRaw(method, path, body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${path}`, opts);

    if (res.status === 401) {
        logout();
        return;
    }
    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
}

async function api(method, path, body = null) {
    const slowTimer = setTimeout(() => {
        toast('Servidor acordando no Render. Pode demorar alguns segundos...', 'info', 7000);
    }, 8000);

    try {
        return await apiRaw(method, path, body);
    } catch (err) {
        if (err instanceof TypeError) {
            throw new Error('NÃ£o foi possÃ­vel conectar agora. Verifique a internet ou aguarde o Render acordar.');
        }
        throw err;
    } finally {
        clearTimeout(slowTimer);
    }
}

// --- Toasts -----------------------------------------------------
// SEGURANÇA: message inserida via textContent — nunca innerHTML

function toast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || '●';

    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-msg';
    msgSpan.textContent = message; // textContent — XSS-safe

    t.appendChild(iconSpan);
    t.appendChild(msgSpan);
    container.appendChild(t);

    requestAnimationFrame(() => t.classList.add('toast-visible'));

    setTimeout(() => {
        t.classList.remove('toast-visible');
        t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, duration);
}

// --- Tema -------------------------------------------------------

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeBtn();
}

function toggleTheme() {
    const current = localStorage.getItem('theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

function updateThemeBtn() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const isDark = (localStorage.getItem('theme') || 'dark') === 'dark';
    btn.textContent = isDark ? '☀' : '◑';
    btn.title = isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro';
}

// --- Sidebar mobile ---------------------------------------------

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function logout() {
    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userProfileImage');
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
}

function setAvatar(el, name, image) {
    el.textContent = '';
    el.style.backgroundImage = '';
    el.classList.remove('has-photo');

    if (image) {
        el.classList.add('has-photo');
        el.style.backgroundImage = `url("${image}")`;
        return;
    }

    el.textContent = (name || '?').charAt(0).toUpperCase();
}

// --- Botão de loading -------------------------------------------

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    const t = btn.querySelector('.btn-text');
    const l = btn.querySelector('.btn-loader');
    if (t) t.classList.toggle('hidden', loading);
    if (l) l.classList.toggle('hidden', !loading);
}

// --- Select de categorias (modal de tarefa) --------------------
// SEGURANÇA: name e icon inseridos via textContent

async function loadCategoriesIntoSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    try {
        const cats = await api('GET', '/categories');
        sel.replaceChildren();

        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = 'Nenhuma';
        sel.appendChild(blank);

        (cats || []).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = (c.icon ? c.icon + ' ' : '') + c.name; // textContent — XSS-safe
            sel.appendChild(opt);
        });
    } catch (_) { /* categorias são opcionais — falha silenciosa */ }
}

// --- Sanitização ------------------------------------------------

/**
 * Escapa HTML para uso seguro dentro de atributos ou conteúdo.
 * Inclui aspas simples (&#39;) para uso seguro em onclick='...'
 */
function escHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Valida se uma string é uma cor hex CSS válida (#rgb ou #rrggbb).
 * Evita CSS injection ao inserir cores vindas do servidor em style="".
 */
function safeColor(color, fallback = '#3b82f6') {
    return /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(color) ? color : fallback;
}

// --- Prazo no modal de tarefa (Dashboard + Kanban) --------------

function _taskEndDateForPrazo(task) {
    if (!task) return '';
    return task.endDate || task.dueDate || '';
}

/** Define modo a partir dos campos da tarefa: none | single | range */
function inferPrazoModeFromTask(task) {
    const end = _taskEndDateForPrazo(task);
    const start = task.startDate;
    if (start && end) return 'range';
    if (end) return 'single';
    if (start) return 'range';
    return 'none';
}

function syncPrazoModeUI() {
    const modeInput = document.querySelector('input[name="taskPrazoMode"]:checked');
    const mode = modeInput ? modeInput.value : 'none';
    const row = document.getElementById('prazoDatesRow');
    const gStart = document.getElementById('taskStartDateGroup');
    const lblEnd = document.getElementById('taskEndDateLabel');
    const lblStart = document.getElementById('taskStartDateLabel');
    const hint = document.querySelector('.prazo-hint');
    if (!row || !gStart) return;

    if (mode === 'none') {
        row.classList.add('hidden');
        if (hint) hint.classList.add('hidden');
        return;
    }

    row.classList.remove('hidden');
    if (hint) hint.classList.toggle('hidden', mode !== 'range');

    if (mode === 'single') {
        gStart.classList.add('hidden');
        if (lblEnd) lblEnd.textContent = 'Data de vencimento';
    } else {
        gStart.classList.remove('hidden');
        if (lblStart) lblStart.textContent = 'Início (de)';
        if (lblEnd) lblEnd.textContent = 'Fim (até)';
    }
}

function setTaskPrazoMode(mode) {
    const allowed = ['none', 'single', 'range'];
    const m = allowed.includes(mode) ? mode : 'none';
    const el = document.querySelector(`input[name="taskPrazoMode"][value="${m}"]`);
    if (el) el.checked = true;
    else {
        const n = document.querySelector('input[name="taskPrazoMode"][value="none"]');
        if (n) n.checked = true;
    }
    syncPrazoModeUI();
}

function setupTaskPrazoModeListeners() {
    document.querySelectorAll('input[name="taskPrazoMode"]').forEach(r => {
        if (r.dataset.prazoBound === '1') return;
        r.dataset.prazoBound = '1';
        r.addEventListener('change', () => {
            if (r.value === 'single') {
                const s = document.getElementById('taskStartDate');
                if (s) s.value = '';
            }
            if (r.value === 'none') {
                const s = document.getElementById('taskStartDate');
                const e = document.getElementById('taskEndDate');
                if (s) s.value = '';
                if (e) e.value = '';
            }
            syncPrazoModeUI();
        });
    });
    syncPrazoModeUI();
}

/** Valida prazo conforme radios do modal; retorna datas para o JSON da API. */
function validateAndGetTaskDates() {
    const mode = document.querySelector('input[name="taskPrazoMode"]:checked')?.value || 'none';
    const startEl = document.getElementById('taskStartDate');
    const endEl = document.getElementById('taskEndDate');
    let startDate = (startEl && startEl.value) ? startEl.value : null;
    let endDate = (endEl && endEl.value) ? endEl.value : null;

    if (mode === 'none') {
        return { ok: true, startDate: null, endDate: null };
    }
    if (mode === 'single') {
        if (!endDate) {
            return { ok: false, message: 'Informe a data de vencimento ou escolha "Sem prazo".' };
        }
        return { ok: true, startDate: null, endDate };
    }
    if (mode === 'range') {
        if (!startDate || !endDate) {
            return {
                ok: false,
                message: 'No intervalo, preencha início e fim (ex.: 05/06/2026 até 08/06/2026).',
            };
        }
        if (startDate > endDate) {
            return { ok: false, message: 'A data inicial não pode ser depois da data final.' };
        }
        return { ok: true, startDate, endDate };
    }
    return { ok: true, startDate: null, endDate: null };
}

// --- Funções de Ajuda para DOM Seguro (DRY & Hardening) --------

/** Cria um elemento DOM com classe e (opcionalmente) texto seguros. */
function createElementWithClass(tag, className, textContent = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
}

/** Cria um card meta-item padronizado (usado em tasks e kanban) */
function createMetaItem(content, extraClass = '') {
    const el = createElementWithClass('span', `kcard-meta-item ${extraClass}`.trim());
    el.textContent = content;
    return el;
}
