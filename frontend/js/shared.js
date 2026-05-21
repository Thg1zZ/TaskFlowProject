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
    { href: 'calendar.html',   icon: '📅', label: 'Calendário' },
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
            throw new Error('Não foi possível conectar agora. Verifique a internet ou aguarde o Render acordar.');
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

const DEFAULT_CATEGORY_PRESETS = [
    { name: 'Trabalho', icon: '💼', color: '#3b82f6' },
    { name: 'Estudos', icon: '📚', color: '#8b5cf6' },
    { name: 'Pessoal', icon: '✨', color: '#ec4899' },
    { name: 'Urgente', icon: '⚡', color: '#ef4444' },
    { name: 'Casa', icon: '🏠', color: '#22d3a5' },
    { name: 'Saúde', icon: '💚', color: '#14b8a6' },
    { name: 'Financeiro', icon: '💰', color: '#f59e0b' },
];

async function fetchUserCategories({ ensureDefaults = false } = {}) {
    let cats = await api('GET', '/categories');
    cats = Array.isArray(cats) ? cats : [];

    if (!ensureDefaults || cats.length > 0) return cats;

    await Promise.allSettled(
        DEFAULT_CATEGORY_PRESETS.map(cat => api('POST', '/categories', cat))
    );

    const refreshed = await api('GET', '/categories');
    return Array.isArray(refreshed) ? refreshed : [];
}

async function loadCategoriesIntoSelect(selectId, options = {}) {
    const sel = document.getElementById(selectId);
    if (!sel) return;

    const {
        ensureDefaults = true,
        includeManageOption = false,
        manageOptionLabel = 'Personalizar categorias...',
        emptyLabel = 'Nenhuma',
    } = options;

    try {
        const cats = await fetchUserCategories({ ensureDefaults });
        sel.replaceChildren();

        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = emptyLabel;
        sel.appendChild(blank);

        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = (c.icon ? c.icon + ' ' : '') + c.name; // textContent — XSS-safe
            sel.appendChild(opt);
        });

        if (includeManageOption) {
            const manage = document.createElement('option');
            manage.value = '__manage_categories__';
            manage.textContent = manageOptionLabel;
            sel.appendChild(manage);
        }
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

// --- Funções Compartilhadas de Formatação e Utilitários de Tarefa (DRY) ---

function formatDate(d) {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
}

function taskEndDate(task) {
    return task.endDate || task.dueDate || '';
}

function formatTaskRange(task) {
    const start = task.startDate;
    const end = taskEndDate(task);
    if (start && end) return `${formatDate(start)} até ${formatDate(end)}`;
    if (end) return formatDate(end);
    if (start) return `A partir de ${formatDate(start)}`;
    return '';
}

function fmtMin(m) {
    if (!m) return '';
    if (m < 60) return `${m}min`;
    const h   = Math.floor(m / 60);
    const min = m % 60;
    return min ? `${h}h${min}m` : `${h}h`;
}

// ============================================================
// ⏱️ MOTOR DO CRONÔMETRO POMODORO INTEGRADO (TIME TRACKING)
// ============================================================

let timerInterval = null;
let timerSeconds = 25 * 60;
let timerMode = 'pomodoro'; // 'pomodoro', 'short', 'long'
let timerTask = null; // { id, title }
let isTimerRunning = false;

// Durações personalizadas (em minutos), lidas do localStorage
let customDurations = {
    pomodoro: parseInt(localStorage.getItem('tf_dur_pomodoro'), 10) || 25,
    short:    parseInt(localStorage.getItem('tf_dur_short'), 10)    || 5,
    long:     parseInt(localStorage.getItem('tf_dur_long'), 10)     || 15,
};

function saveCustomDurations() {
    localStorage.setItem('tf_dur_pomodoro', customDurations.pomodoro);
    localStorage.setItem('tf_dur_short',    customDurations.short);
    localStorage.setItem('tf_dur_long',     customDurations.long);
}

function loadTimerState() {
    // Recarrega durações personalizadas
    customDurations.pomodoro = parseInt(localStorage.getItem('tf_dur_pomodoro'), 10) || 25;
    customDurations.short    = parseInt(localStorage.getItem('tf_dur_short'), 10)    || 5;
    customDurations.long     = parseInt(localStorage.getItem('tf_dur_long'), 10)     || 15;

    const stateStr = localStorage.getItem('tf_pomodoro_state');
    if (!stateStr) return;

    try {
        const state = JSON.parse(stateStr);
        timerMode = state.timerMode || 'pomodoro';
        timerTask = state.timerTask || null;
        isTimerRunning = state.isTimerRunning || false;
        
        const savedSeconds = state.timerSeconds !== undefined ? state.timerSeconds : (getModeDefaultTime('pomodoro') * 60);
        const lastTick = state.lastTickTimestamp || Date.now();
        const gap = Math.floor((Date.now() - lastTick) / 1000);

        if (isTimerRunning) {
            timerSeconds = Math.max(0, savedSeconds - gap);
            if (timerSeconds === 0) {
                isTimerRunning = false;
                timerSeconds = getModeDefaultTime(timerMode) * 60;
            }
        } else {
            timerSeconds = savedSeconds;
        }
    } catch (e) {
        console.error('Erro ao ler estado do Pomodoro:', e);
    }
}

function saveTimerState() {
    const state = {
        timerSeconds,
        timerMode,
        timerTask,
        isTimerRunning,
        lastTickTimestamp: Date.now()
    };
    localStorage.setItem('tf_pomodoro_state', JSON.stringify(state));
}

function getModeDefaultTime(mode) {
    if (mode === 'short') return customDurations.short;
    if (mode === 'long')  return customDurations.long;
    return customDurations.pomodoro;
}

function formatClockTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Sintetizador de Áudio Nativo (Web Audio API)
function playChimeSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Nota DING
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // Lá (A5)
        gain1.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.6);
        
        // Nota DONG (atrasada 400ms)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(698.46, audioCtx.currentTime + 0.4); // Fá (F5)
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.4, audioCtx.currentTime + 0.4);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        osc2.start(audioCtx.currentTime + 0.4);
        osc2.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
        console.warn('Web Audio API não autorizada pelo navegador ainda:', e);
    }
}

// Envia tempo trabalhado para o backend
async function logTaskTime(taskId, minutes) {
    try {
        const res = await api('PATCH', `/tasks/${taskId}/track-time`, { minutes });
        toast(`⏱️ ${minutes} minutos focados foram salvos no banco!`, 'success');
        // Disparar evento customizado para forçar atualização da tela se necessário
        window.dispatchEvent(new CustomEvent('taskTimeUpdated', { detail: { taskId, timeSpentMinutes: res.timeSpentMinutes } }));
    } catch (e) {
        console.error('Falha ao registrar tempo no backend:', e);
        toast('Não foi possível registrar o tempo focado no servidor.', 'error');
    }
}

function initializePomodoroWidget() {
    // Só renderiza se estiver logado (evita auth pages)
    if (!sessionStorage.getItem('token')) return;

    // Remove anterior se existir para evitar duplicações
    const old = document.getElementById('pomodoroFloatingWidget');
    if (old) old.remove();

    loadTimerState();

    const widget = document.createElement('div');
    widget.id = 'pomodoroFloatingWidget';
    widget.className = 'pomodoro-widget collapsed';

    widget.innerHTML = `
        <div class="pomodoro-collapsed-bubble" title="Cronômetro Pomodoro Focus">
            ⏱️
            <div id="pomodoroCollapsedBadge" class="pomodoro-collapsed-badge ${isTimerRunning ? 'running' : ''}"></div>
        </div>
        <div class="pomodoro-expanded-content hidden">
            <div class="pomodoro-header">
                <span class="pomodoro-title">⏱️ Pomodoro</span>
                <div class="pomodoro-control-top">
                    <button id="pomodoroBtnSettings" class="pomodoro-btn-close" title="Configurações">⚙️</button>
                    <button id="pomodoroBtnToggleCollapse" class="pomodoro-btn-close" title="Minimizar">➖</button>
                </div>
            </div>
            <div id="pomodoroTaskBadge" class="pomodoro-task-badge">Nenhuma tarefa focada</div>
            <div class="pomodoro-modes">
                <button class="pomodoro-mode-btn" data-mode="pomodoro">Foco (${customDurations.pomodoro}m)</button>
                <button class="pomodoro-mode-btn" data-mode="short">Pausa Curta (${customDurations.short}m)</button>
                <button class="pomodoro-mode-btn" data-mode="long">Pausa Longa (${customDurations.long}m)</button>
            </div>
            <div class="pomodoro-timer-display">
                <div id="pomodoroClock" class="pomodoro-clock">25:00</div>
            </div>
            <div class="pomodoro-controls">
                <button id="pomodoroBtnReset" class="pomodoro-btn-round" title="Reiniciar">🔄</button>
                <button id="pomodoroBtnPlayPause" class="pomodoro-btn-round play-pause" title="Iniciar">▶️</button>
                <button id="pomodoroBtnSkip" class="pomodoro-btn-round" title="Pular">⏭️</button>
            </div>
            <div id="pomodoroSettingsPanel" class="pomodoro-settings-panel hidden">
                <p class="pomodoro-settings-title">⚙️ Personalizar Durações</p>
                <div class="pomodoro-settings-row">
                    <label>🎯 Foco (min)</label>
                    <input type="number" id="inputDurPomodoro" class="pomodoro-dur-input" min="1" max="120" value="${customDurations.pomodoro}">
                </div>
                <div class="pomodoro-settings-row">
                    <label>☕ Pausa Curta (min)</label>
                    <input type="number" id="inputDurShort" class="pomodoro-dur-input" min="1" max="60" value="${customDurations.short}">
                </div>
                <div class="pomodoro-settings-row">
                    <label>🛌 Pausa Longa (min)</label>
                    <input type="number" id="inputDurLong" class="pomodoro-dur-input" min="1" max="120" value="${customDurations.long}">
                </div>
                <button id="btnSavePomodoroSettings" class="pomodoro-settings-save-btn">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(widget);

    const collapsedBubble = widget.querySelector('.pomodoro-collapsed-bubble');
    const expandedContent = widget.querySelector('.pomodoro-expanded-content');
    const clockEl = widget.querySelector('#pomodoroClock');
    const taskBadge = widget.querySelector('#pomodoroTaskBadge');
    const playPauseBtn = widget.querySelector('#pomodoroBtnPlayPause');
    const resetBtn = widget.querySelector('#pomodoroBtnReset');
    const skipBtn = widget.querySelector('#pomodoroBtnSkip');
    const collapseBtn = widget.querySelector('#pomodoroBtnToggleCollapse');
    const settingsBtn = widget.querySelector('#pomodoroBtnSettings');
    const settingsPanel = widget.querySelector('#pomodoroSettingsPanel');
    const modeBtns = widget.querySelectorAll('.pomodoro-mode-btn');

    // Restaura layout colapsado/expandido do sessionStorage
    const isWidgetExpanded = sessionStorage.getItem('tf_pomodoro_expanded') === 'true';
    if (isWidgetExpanded) {
        widget.classList.remove('collapsed');
        expandedContent.classList.remove('hidden');
    }

    // Toggle expandir
    collapsedBubble.addEventListener('click', (e) => {
        if (!widget.classList.contains('collapsed')) return;
        widget.classList.remove('collapsed');
        expandedContent.classList.remove('hidden');
        sessionStorage.setItem('tf_pomodoro_expanded', 'true');
    });

    // Toggle colapsar
    collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        widget.classList.add('collapsed');
        expandedContent.classList.add('hidden');
        settingsPanel.classList.add('hidden');
        sessionStorage.setItem('tf_pomodoro_expanded', 'false');
    });

    // Toggle painel de configurações
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.toggle('hidden');
    });

    // Salvar configurações personalizadas
    widget.querySelector('#btnSavePomodoroSettings').addEventListener('click', () => {
        const pVal = parseInt(widget.querySelector('#inputDurPomodoro').value, 10);
        const sVal = parseInt(widget.querySelector('#inputDurShort').value, 10);
        const lVal = parseInt(widget.querySelector('#inputDurLong').value, 10);

        if (!pVal || pVal < 1 || pVal > 120) { toast('Foco: insira entre 1 e 120 min.', 'error'); return; }
        if (!sVal || sVal < 1 || sVal > 60)  { toast('Pausa Curta: insira entre 1 e 60 min.', 'error'); return; }
        if (!lVal || lVal < 1 || lVal > 120) { toast('Pausa Longa: insira entre 1 e 120 min.', 'error'); return; }

        customDurations.pomodoro = pVal;
        customDurations.short    = sVal;
        customDurations.long     = lVal;
        saveCustomDurations();

        // Atualiza os labels dos botões de modo
        updateModeBtnLabels();

        // Se o timer não está rodando, atualiza o timer atual para a nova duração
        if (!isTimerRunning) {
            timerSeconds = getModeDefaultTime(timerMode) * 60;
            saveTimerState();
        }

        updateWidgetView();
        settingsPanel.classList.add('hidden');
        toast('✅ Durações salvas com sucesso!', 'success');
    });

    // Atualiza View do Estado Inicial
    updateWidgetView();

    // Inicia o intervalo de contagem se estivesse ativo anteriormente
    if (isTimerRunning) {
        startTicker();
    }

    // Eventos de Modos de Foco
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchMode(mode);
        });
    });

    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
        if (isTimerRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        resetTimer();
    });

    // Skip/Pular
    skipBtn.addEventListener('click', () => {
        skipTimer();
    });

    function updateModeBtnLabels() {
        modeBtns.forEach(btn => {
            const m = btn.dataset.mode;
            if (m === 'pomodoro') btn.textContent = `Foco (${customDurations.pomodoro}m)`;
            if (m === 'short')    btn.textContent = `Pausa Curta (${customDurations.short}m)`;
            if (m === 'long')     btn.textContent = `Pausa Longa (${customDurations.long}m)`;
        });
    }

    function updateWidgetView() {
        clockEl.textContent = formatClockTime(timerSeconds);
        
        // Atualiza botões de modo (active state)
        modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === timerMode);
        });

        // Nome da Tarefa
        if (timerTask) {
            taskBadge.textContent = `Foco: ${timerTask.title}`;
            taskBadge.title = timerTask.title;
            taskBadge.classList.remove('hidden');
        } else {
            taskBadge.textContent = 'Sem tarefa em foco';
            taskBadge.title = '';
        }

        // Ícone de Play/Pause
        playPauseBtn.textContent = isTimerRunning ? '⏸️' : '▶️';
        playPauseBtn.title = isTimerRunning ? 'Pausar' : 'Iniciar';

        // Badge flutuante colapsado
        const badge = widget.querySelector('#pomodoroCollapsedBadge');
        if (badge) badge.classList.toggle('running', isTimerRunning);
    }

    function switchMode(newMode) {
        pauseTimer();
        timerMode = newMode;
        timerSeconds = getModeDefaultTime(newMode) * 60;
        updateWidgetView();
        saveTimerState();
    }

    function startTimer() {
        if (isTimerRunning) return;
        isTimerRunning = true;
        updateWidgetView();
        saveTimerState();
        startTicker();
    }

    function pauseTimer() {
        if (!isTimerRunning) return;
        isTimerRunning = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        updateWidgetView();
        saveTimerState();
    }

    function startTicker() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                clockEl.textContent = formatClockTime(timerSeconds);
                if (timerSeconds % 10 === 0) { // Salva estado a cada 10s para resiliência
                    saveTimerState();
                }
            } else {
                handleTimerFinished();
            }
        }, 1000);
    }

    function handleTimerFinished() {
        pauseTimer();
        playChimeSound();

        const minutesFocused = getModeDefaultTime(timerMode);

        if (timerMode === 'pomodoro') {
            toast('🏆 Sessão de foco concluída com sucesso! Excelente trabalho!', 'success');
            
            // Logar tempo no backend se houver tarefa
            if (timerTask && timerTask.id) {
                logTaskTime(timerTask.id, minutesFocused);
            }
            
            // Próximo automático: Pausa Curta
            switchMode('short');
        } else {
            toast('☕ Pausa concluída! Hora de focar novamente.', 'success');
            switchMode('pomodoro');
        }
    }

    function resetTimer() {
        pauseTimer();
        timerSeconds = getModeDefaultTime(timerMode) * 60;
        updateWidgetView();
        saveTimerState();
    }

    function skipTimer() {
        pauseTimer();
        if (timerMode === 'pomodoro') {
            switchMode('short');
        } else {
            switchMode('pomodoro');
        }
    }

    // Expõe globalmente a ativação de foco externa (invocada pelo modal de detalhes de qualquer página)
    window.startPomodoroFocus = function(task) {
        if (!task || !task.id) return;
        
        timerTask = { id: task.id, title: task.title };
        timerMode = 'pomodoro';
        timerSeconds = getModeDefaultTime('pomodoro') * 60;
        
        // Expande o widget para dar feedback visual
        widget.classList.remove('collapsed');
        expandedContent.classList.remove('hidden');
        sessionStorage.setItem('tf_pomodoro_expanded', 'true');
        
        startTimer();
    };
}

// Inicializa no carregamento do DOM
window.addEventListener('DOMContentLoaded', () => {
    initializePomodoroWidget();
});

// Re-inicializa em logins sucedidos
window.addEventListener('loginSuccess', () => {
    initializePomodoroWidget();
});

// Centraliza a renderização e bindings da seção de Time Tracking nos modais de detalhe (DRY)
function renderDetailTimeTracking(task, openDetailCallback) {
    let timerSec = document.getElementById('detailTimerSection');
    if (!timerSec) {
        timerSec = document.createElement('div');
        timerSec.id = 'detailTimerSection';
        timerSec.className = 'detail-timer-section';
        const desc = document.getElementById('detailDescription');
        if (desc) {
            desc.parentNode.insertBefore(timerSec, desc.nextSibling);
        } else {
            return;
        }
    }

    const spent = task.timeSpentMinutes || 0;
    const est = task.estimatedMinutes || 0;
    const pct = est > 0 ? Math.min(100, Math.round((spent / est) * 100)) : 0;
    const overrun = spent > est && est > 0;

    timerSec.innerHTML = `
        <div class="detail-timer-header">
            <span>⏱️ Tempo Gasto: <strong>${fmtMin(spent)}</strong> ${est > 0 ? `/ ${fmtMin(est)} estimado` : ''}</span>
            <div class="detail-timer-actions">
                <button class="btn-detail-focus" id="btnDetailFocus">Focar (Pomodoro)</button>
            </div>
        </div>
        <div class="timer-progress-track">
            <div class="timer-progress-fill ${overrun ? 'overrun' : ''}" style="width: ${pct}%"></div>
        </div>
        <div class="manual-time-input-group">
            <input type="number" class="manual-time-input" id="manualTimeInput" min="1" max="1440" placeholder="Minutos">
            <button class="btn-manual-time-save" id="btnManualTimeSave">Registrar Tempo</button>
        </div>
    `;

    document.getElementById('btnDetailFocus').addEventListener('click', () => {
        window.startPomodoroFocus(task);
    });

    document.getElementById('btnManualTimeSave').addEventListener('click', async () => {
        const input = document.getElementById('manualTimeInput');
        const mins = parseInt(input.value, 10);
        if (!mins || mins <= 0) {
            toast('Por favor, insira um valor válido em minutos.', 'error');
            return;
        }
        if (mins > 1440) {
            toast('Máximo de 1440 minutos (24 horas) por registro.', 'error');
            return;
        }
        try {
            const res = await api('PATCH', `/tasks/${task.id}/track-time`, { minutes: mins });
            task.timeSpentMinutes = res.timeSpentMinutes;
            
            // Re-renderiza o modal
            openDetailCallback(task.id);
            
            // Sincroniza na listagem principal
            const mainTask = allTasks.find(t => t.id === task.id);
            if (mainTask) mainTask.timeSpentMinutes = res.timeSpentMinutes;
            
            if (typeof renderTasks === 'function') renderTasks();
            else if (typeof renderBoard === 'function') renderBoard();
            else if (typeof renderCalendar === 'function') renderCalendar();

            toast('Tempo registrado com sucesso!', 'success');
        } catch (e) {
            toast(e.message || 'Erro ao registrar tempo', 'error');
        }
    });
}
