// categories.js — depende de shared.js (api, toast, setLoading, escHtml)

// Mapa local id→objeto para evitar JSON.stringify em atributos HTML
const catMap = new Map();

let deleteCatTargetId = null;

const PRESET_COLORS = [
    '#3b82f6', '#22d3a5', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

const SUGGESTED_CATEGORIES = [
    { name: 'Trabalho', icon: '💼', color: '#3b82f6' },
    { name: 'Estudos', icon: '📚', color: '#8b5cf6' },
    { name: 'Pessoal', icon: '✨', color: '#ec4899' },
    { name: 'Urgente', icon: '⚡', color: '#ef4444' },
    { name: 'Casa', icon: '🏠', color: '#22d3a5' },
    { name: 'Saúde', icon: '💚', color: '#14b8a6' },
    { name: 'Financeiro', icon: '💰', color: '#f59e0b' },
];

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    buildColorPresets();
    renderSuggestedCategories();

    document.getElementById('catColorPicker').addEventListener('input', e => {
        document.getElementById('catColor').value = e.target.value;
    });

    document.getElementById('catColor').addEventListener('input', e => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            document.getElementById('catColorPicker').value = e.target.value;
        }
    });

    document.getElementById('catForm').addEventListener('submit', handleCatSubmit);
    
    // Bind global events
    document.querySelectorAll('.btn-new-cat').forEach(btn => btn.addEventListener('click', () => openCatModal()));
    document.querySelectorAll('.btn-close-cat-modal').forEach(btn => btn.addEventListener('click', closeCatModal));
    document.querySelectorAll('.btn-close-del-cat-modal').forEach(btn => btn.addEventListener('click', closeDeleteCat));
    document.getElementById('confirmDeleteCatBtn')?.addEventListener('click', confirmDeleteCat);
});

function buildColorPresets() {
    const row = document.getElementById('colorPresets');
    row.replaceChildren();
    PRESET_COLORS.forEach(color => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-dot';
        btn.style.background = color;
        btn.title = color;
        btn.addEventListener('click', () => selectColor(color));
        row.appendChild(btn);
    });
}

function selectColor(color) {
    document.getElementById('catColor').value       = color;
    document.getElementById('catColorPicker').value = color;
}

function renderSuggestedCategories() {
    const grid = document.getElementById('suggestedCatGrid');
    if (!grid) return;
    grid.replaceChildren();

    SUGGESTED_CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'suggested-cat-btn';
        btn.style.setProperty('--cat-color', cat.color);

        const icon = document.createElement('span');
        icon.textContent = cat.icon;
        const name = document.createElement('strong');
        name.textContent = cat.name;

        btn.appendChild(icon);
        btn.appendChild(name);
        btn.addEventListener('click', () => createSuggestedCategory(cat, btn));
        grid.appendChild(btn);
    });
}

async function createSuggestedCategory(cat, btn) {
    btn.disabled = true;
    try {
        await api('POST', '/categories', cat);
        toast(`Categoria "${cat.name}" criada!`, 'success');
        await loadCategories();
    } catch (err) {
        toast(err.message || 'Categoria já existe ou não pôde ser criada', 'warning');
    } finally {
        btn.disabled = false;
    }
}

// --- Carregamento -----------------------------------------------

async function loadCategories() {
    try {
        const cats = await api('GET', '/categories');
        catMap.clear();
        (cats || []).forEach(c => catMap.set(c.id, c));
        renderCategories(cats || []);
    } catch {
        toast('Erro ao carregar categorias', 'error');
    }
}

function renderCategories(cats) {
    const grid  = document.getElementById('catGrid');
    const empty = document.getElementById('catEmpty');

    if (!cats.length) {
        grid.replaceChildren();
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    grid.replaceChildren();

    cats.forEach(cat => {
        const card = buildCatCard(cat);
        grid.appendChild(card);
    });
}

// Usa createElement — sem JSON.stringify em onclick, sem innerHTML com dados do servidor
function buildCatCard(cat) {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.setProperty('--cat-color', cat.color || '#3b82f6');

    const accent = document.createElement('div');
    accent.className = 'cat-card-accent';

    const body = document.createElement('div');
    body.className = 'cat-card-body';

    const iconEl = document.createElement('div');
    iconEl.className = 'cat-card-icon';
    iconEl.textContent = cat.icon || '◈';

    const info = document.createElement('div');
    info.className = 'cat-card-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'cat-card-name';
    nameEl.textContent = cat.name;

    const countEl = document.createElement('span');
    countEl.className = 'cat-card-count';
    countEl.textContent = `${cat.taskCount} tarefa${cat.taskCount !== 1 ? 's' : ''}`;

    info.appendChild(nameEl);
    info.appendChild(countEl);

    const actions = document.createElement('div');
    actions.className = 'cat-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn';
    editBtn.title = 'Editar';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => openEditCat(cat.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'task-action-btn delete';
    delBtn.title = 'Excluir';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => openDeleteCat(cat.id, cat.name));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    body.appendChild(iconEl);
    body.appendChild(info);
    body.appendChild(actions);

    card.appendChild(accent);
    card.appendChild(body);
    return card;
}

// --- Modais -----------------------------------------------------

function openCatModal() {
    document.getElementById('catId').value   = '';
    document.getElementById('catName').value = '';
    document.getElementById('catIcon').value = '';
    selectColor('#3b82f6');
    document.getElementById('catNameErr').textContent = '';
    document.getElementById('catModalTitle').textContent = 'Nova Categoria';
    document.getElementById('catModalOverlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('catName')?.focus(), 50);
}

function openEditCat(catId) {
    const cat = catMap.get(catId);
    if (!cat) return;
    document.getElementById('catId').value   = cat.id;
    document.getElementById('catName').value = cat.name;
    document.getElementById('catIcon').value = cat.icon || '';
    selectColor(cat.color || '#3b82f6');
    document.getElementById('catNameErr').textContent = '';
    document.getElementById('catModalTitle').textContent = 'Editar Categoria';
    document.getElementById('catModalOverlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('catName')?.focus(), 50);
}

function closeCatModal() { document.getElementById('catModalOverlay').classList.add('hidden'); }
function closeCatModalOutside(e) {
    if (e.target === document.getElementById('catModalOverlay')) closeCatModal();
}

async function handleCatSubmit(e) {
    e.preventDefault();
    const id    = document.getElementById('catId').value;
    const name  = document.getElementById('catName').value.trim();
    const icon  = document.getElementById('catIcon').value.trim() || null;
    const color = document.getElementById('catColor').value.trim() || '#3b82f6';

    document.getElementById('catNameErr').textContent = '';
    if (!name) {
        document.getElementById('catNameErr').textContent = 'Nome é obrigatório';
        return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        document.getElementById('catNameErr').textContent = 'Cor inválida (use formato #rrggbb)';
        return;
    }

    setLoading('saveCatBtn', true);
    try {
        if (id) {
            await api('PUT', `/categories/${id}`, { name, icon, color });
            toast('Categoria atualizada!', 'success');
        } else {
            await api('POST', '/categories', { name, icon, color });
            toast('Categoria criada!', 'success');
        }
        closeCatModal();
        await loadCategories();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        setLoading('saveCatBtn', false);
    }
}

// --- Excluir ----------------------------------------------------

function openDeleteCat(id, name) {
    deleteCatTargetId = id;
    document.getElementById('deleteCatName').textContent = `"${name}"`;
    document.getElementById('deleteCatOverlay').classList.remove('hidden');
}

function closeDeleteCat() {
    deleteCatTargetId = null;
    document.getElementById('deleteCatOverlay').classList.add('hidden');
}

function closeDeleteCatOutside(e) {
    if (e.target === document.getElementById('deleteCatOverlay')) closeDeleteCat();
}

async function confirmDeleteCat() {
    if (!deleteCatTargetId) return;
    const btn = document.getElementById('confirmDeleteCatBtn');
    btn.disabled = true;
    try {
        await api('DELETE', `/categories/${deleteCatTargetId}`);
        catMap.delete(deleteCatTargetId);
        toast('Categoria excluída', 'info');
        closeDeleteCat();
        await loadCategories();
    } catch {
        toast('Erro ao excluir categoria', 'error');
        btn.disabled = false;
    }
}
