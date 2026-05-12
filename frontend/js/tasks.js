// tasks.js — depende de shared.js (api, toast, setLoading, escHtml, safeColor, logout)

// --- Estado -----------------------------------------------------

let allTasks       = [];
let allCategories  = [];
let currentFilter  = 'ALL';
let currentCatFilter = '';
let currentSort    = 'newest';
let currentView    = localStorage.getItem('taskView') || 'grid';
let deleteTargetId = null;
let detailTaskId   = null;
let selectedIds    = new Set();
let searchTimer    = null;
let isSavingTask   = false;

// --- Init -------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    applyView(currentView);
    await Promise.all([loadTasks(), loadStats(), loadCatsForFilter()]);
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
    setupTaskPrazoModeListeners();
    setupKeyboardShortcuts();

    const commentAvatar = document.getElementById('commentAvatar');
    if (commentAvatar) {
        commentAvatar.textContent = (sessionStorage.getItem('userName') || localStorage.getItem('userName') || '?').charAt(0).toUpperCase();
    }

    // Bindings
    document.getElementById('searchInput')?.addEventListener('input', e => debounceSearch(e.target.value));
    document.getElementById('catFilter')?.addEventListener('change', e => applyCatFilter(e.target.value));
    document.getElementById('sortSelect')?.addEventListener('change', e => sortTasks(e.target.value));
    
    document.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.getAttribute('data-view'))));
    document.getElementById('btnExportMenu')?.addEventListener('click', openExportMenu);
    document.querySelectorAll('.btn-new-task').forEach(btn => btn.addEventListener('click', () => openModal()));
    
    document.querySelectorAll('.stat-card[data-status-filter]').forEach(el => 
        el.addEventListener('click', () => filterByStatus(el.getAttribute('data-status-filter'))));
        
    document.querySelectorAll('.filter-tab[data-filter]').forEach(btn => 
        btn.addEventListener('click', () => setFilterTab(btn, btn.getAttribute('data-filter'))));
        
    document.querySelectorAll('.bulk-btn[data-bulk-status]').forEach(btn => 
        btn.addEventListener('click', () => bulkChangeStatus(btn.getAttribute('data-bulk-status'))));
        
    document.getElementById('btnBulkDelete')?.addEventListener('click', bulkDelete);
    document.getElementById('btnBulkCancel')?.addEventListener('click', clearSelection);
    
    document.querySelectorAll('.btn-close-modal').forEach(btn => btn.addEventListener('click', closeModal));
    document.querySelectorAll('.btn-close-detail').forEach(btn => btn.addEventListener('click', closeDetail));
    document.getElementById('detailEditBtn')?.addEventListener('click', editFromDetail);
    document.querySelectorAll('.btn-close-delete').forEach(btn => btn.addEventListener('click', closeDeleteModal));
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
    document.getElementById('commentForm')?.addEventListener('submit', submitComment);
    document.getElementById('btnExportCsv')?.addEventListener('click', () => exportTasks('csv'));
    document.getElementById('btnExportJson')?.addEventListener('click', () => exportTasks('json'));
    
    document.querySelectorAll('.btn-close-shortcuts').forEach(btn => btn.addEventListener('click', closeShortcuts));
});

// --- Carga de dados ---------------------------------------------

async function loadTasks(search = '') {
    showLoading(true);
    try {
        let q = '';
        if (search) {
            q = `?search=${encodeURIComponent(search)}`;
        } else if (currentFilter !== 'ALL' && currentFilter !== 'OVERDUE') {
            q = `?status=${currentFilter}`;
        }
        allTasks = await api('GET', `/tasks${q}`) || [];
        renderTasks();
    } catch {
        toast('Erro ao carregar tarefas', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadStats() {
    try {
        const s     = await api('GET', '/tasks/stats');
        const total = Number(s.total || 0);

        document.getElementById('statTotal').textContent    = total;
        document.getElementById('statTodo').textContent     = s.todo || 0;
        document.getElementById('statProgress').textContent = s.inProgress || 0;
        document.getElementById('statDone').textContent     = s.done || 0;

        updateOverdueStat();

        const pct = n => total > 0 ? Math.round((n / total) * 100) + '%' : '0%';
        document.getElementById('fillTodo').style.width     = pct(s.todo);
        document.getElementById('fillProgress').style.width = pct(s.inProgress);
        document.getElementById('fillDone').style.width     = pct(s.done);
    } catch { /* stats são não-críticos */ }
}

function updateOverdueStat() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const overdue = allTasks.filter(t =>
        taskEndDate(t) && t.status !== 'DONE' && new Date(taskEndDate(t) + 'T00:00:00') < now
    ).length;
    document.getElementById('statOverdue').textContent = overdue;
    const total = allTasks.length || 1;
    document.getElementById('fillOverdue').style.width = Math.round((overdue / total) * 100) + '%';
}

async function loadCatsForFilter() {
    try {
        allCategories = await api('GET', '/categories') || [];
        const sel = document.getElementById('catFilter');
        if (!sel) return;

        // Usar createElement para evitar XSS
        sel.replaceChildren();
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = 'Todas as categorias';
        sel.appendChild(blank);

        allCategories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = (c.icon ? c.icon + ' ' : '') + c.name;
            sel.appendChild(opt);
        });

        await loadCategoriesIntoSelect('taskCategory');
    } catch { /* categorias são opcionais */ }
}

// --- Renderização -----------------------------------------------

function visibleTasks() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    let tasks = [...allTasks];

    if (currentFilter === 'OVERDUE') {
        tasks = tasks.filter(t =>
            taskEndDate(t) && t.status !== 'DONE' && new Date(taskEndDate(t) + 'T00:00:00') < now
        );
    } else if (currentFilter !== 'ALL') {
        tasks = tasks.filter(t => t.status === currentFilter);
    }

    if (currentCatFilter) {
        tasks = tasks.filter(t => String(t.categoryId) === String(currentCatFilter));
    }

    switch (currentSort) {
        case 'oldest':
            tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'priority': {
            const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            tasks.sort((a, b) => order[a.priority] - order[b.priority]);
            break;
        }
        case 'dueDate':
            tasks.sort((a, b) => {
                if (!taskEndDate(a)) return 1;
                if (!taskEndDate(b)) return -1;
                return new Date(taskEndDate(a)) - new Date(taskEndDate(b));
            });
            break;
        case 'title':
            tasks.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
            break;
        default:
            tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return tasks;
}

function renderTasks() {
    const grid  = document.getElementById('taskGrid');
    const empty = document.getElementById('emptyState');
    const tasks = visibleTasks();

    updateOverdueStat();
    clearSelection();

    if (tasks.length === 0) {
        grid.replaceChildren();
        empty.classList.remove('hidden');
        const msgs = {
            ALL:         'Nenhuma tarefa ainda',
            TODO:        'Nenhuma tarefa a fazer',
            IN_PROGRESS: 'Nenhuma tarefa em progresso',
            DONE:        'Nenhuma tarefa concluída',
            OVERDUE:     'Nenhuma tarefa vencida 🎉',
        };
        document.getElementById('emptyMessage').textContent =
            msgs[currentFilter] || 'Nenhuma tarefa encontrada';
        return;
    }
    empty.classList.add('hidden');
    grid.replaceChildren();
    tasks.forEach(task => grid.appendChild(renderCard(task)));
}

function renderCard(task) {
    const statusLabel   = { TODO: 'A Fazer', IN_PROGRESS: 'Em Progresso', DONE: 'Concluída' };
    const priorityLabel = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' };
    const catColor = safeColor(task.categoryColor);

    const now       = new Date(); now.setHours(0, 0, 0, 0);
    const endDate = taskEndDate(task);
    const isOverdue = endDate && task.status !== 'DONE' && new Date(endDate + 'T00:00:00') < now;
    const isSelected = selectedIds.has(task.id);
    const taskId     = Number(task.id);

    const card = document.createElement('div');
    card.className = `task-card priority-${task.priority} status-${task.status} ${isSelected ? 'task-selected' : ''} ${task.status === 'DONE' ? 'task-done' : ''}`;
    card.id = `task-${taskId}`;

    const priorityBar = document.createElement('div');
    priorityBar.className = 'task-card-priority-bar';
    priorityBar.style.background = task.priority === 'HIGH' ? 'var(--red)' : task.priority === 'MEDIUM' ? 'var(--yellow)' : 'var(--green)';
    card.appendChild(priorityBar);

    const inner = document.createElement('div');
    inner.className = 'task-card-inner';

    const checkboxWrapper = document.createElement('label');
    checkboxWrapper.className = 'task-checkbox-wrapper';
    checkboxWrapper.addEventListener('click', e => e.stopPropagation());
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = isSelected;
    checkbox.addEventListener('change', e => toggleSelect(taskId, e.target.checked));
    
    const checkboxCustom = document.createElement('span');
    checkboxCustom.className = 'task-checkbox-custom';
    
    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(checkboxCustom);
    inner.appendChild(checkboxWrapper);

    const header = document.createElement('div');
    header.className = 'task-card-header';
    header.addEventListener('click', () => openDetail(taskId));

    const title = createElementWithClass('span', 'task-card-title', task.title);
    
    const actions = createElementWithClass('div', 'task-card-actions');
    actions.addEventListener('click', e => e.stopPropagation());
    
    const editBtn = createElementWithClass('button', 'task-action-btn', '✎');
    editBtn.title = 'Editar';
    editBtn.addEventListener('click', () => openEditModal(taskId));
    
    const delBtn = createElementWithClass('button', 'task-action-btn delete', '✕');
    delBtn.title = 'Excluir';
    delBtn.addEventListener('click', () => openDeleteModal(taskId));
    
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    header.appendChild(title);
    header.appendChild(actions);
    inner.appendChild(header);

    if (task.description) {
        const desc = createElementWithClass('p', 'task-card-desc', task.description);
        desc.addEventListener('click', () => openDetail(taskId));
        inner.appendChild(desc);
    }

    const meta = createElementWithClass('div', 'task-card-meta');
    
    const statBadge = createElementWithClass('span', `task-badge badge-status-${task.status}`, statusLabel[task.status] || task.status);
    meta.appendChild(statBadge);
    
    const priBadge = createElementWithClass('span', `task-badge badge-priority-${task.priority}`, priorityLabel[task.priority] || task.priority);
    meta.appendChild(priBadge);
    
    if (task.categoryName) {
        const catBadge = createElementWithClass('span', 'task-cat-badge', `${task.categoryIcon || ''} ${task.categoryName}`);
        catBadge.style.background = `${catColor}22`;
        catBadge.style.color = catColor;
        catBadge.style.border = `1px solid ${catColor}44`;
        meta.appendChild(catBadge);
    }
    
    if (endDate) {
        const dueBadge = createElementWithClass('span', `task-badge ${isOverdue ? 'badge-overdue' : 'badge-due'}`, `${isOverdue ? '⚠ ' : '📅 '}${formatTaskRange(task)}`);
        meta.appendChild(dueBadge);
    }
    
    if (task.estimatedMinutes) {
        const estBadge = createElementWithClass('span', 'task-badge badge-est', `⏱ ${fmtMin(task.estimatedMinutes)}`);
        meta.appendChild(estBadge);
    }
    
    if (task.commentCount > 0) {
        const comBadge = createElementWithClass('span', 'task-badge badge-comment', `💬 ${task.commentCount}`);
        meta.appendChild(comBadge);
    }
    inner.appendChild(meta);

    const statusRow = createElementWithClass('div', 'task-status-row');
    
    const select = createElementWithClass('select', `status-select badge-status-${task.status} task-badge`);
    select.addEventListener('change', e => quickStatus(taskId, e.target.value));
    select.addEventListener('click', e => e.stopPropagation());
    
    const opts = [
        { val: 'TODO', text: '○ A Fazer' },
        { val: 'IN_PROGRESS', text: '◑ Em Progresso' },
        { val: 'DONE', text: '● Concluída' }
    ];
    opts.forEach(o => {
        const opt = createElementWithClass('option', '', o.text);
        opt.value = o.val;
        if (task.status === o.val) opt.selected = true;
        select.appendChild(opt);
    });
    
    statusRow.appendChild(select);
    inner.appendChild(statusRow);
    card.appendChild(inner);

    return card;
}

// --- Filtros e ordenação ----------------------------------------

function setFilterTab(btn, filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('searchInput').value = '';
    renderTasks();
}

function filterByStatus(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === filter)
    );
    renderTasks();
}

function applyCatFilter(catId) {
    currentCatFilter = catId;
    renderTasks();
}

function sortTasks(val) {
    currentSort = val;
    renderTasks();
}

function debounceSearch(val) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        if (val) { currentFilter = 'ALL'; loadTasks(val); }
        else loadTasks();
    }, 350);
}

// --- Visualização (grade / lista) -------------------------------

function setView(v) {
    currentView = v;
    localStorage.setItem('taskView', v);
    applyView(v);
}

function applyView(v) {
    const grid = document.getElementById('taskGrid');
    if (!grid) return;
    grid.className = v === 'list' ? 'task-list' : 'task-grid';
    document.getElementById('viewGrid')?.classList.toggle('active', v === 'grid');
    document.getElementById('viewList')?.classList.toggle('active', v === 'list');
}

// --- Seleção e ações em massa -----------------------------------

function toggleSelect(id, checked) {
    if (checked) selectedIds.add(id); else selectedIds.delete(id);
    updateBulkBar();
    document.getElementById(`task-${id}`)?.classList.toggle('task-selected', checked);
}

function clearSelection() {
    selectedIds.clear();
    document.querySelectorAll('.task-checkbox').forEach(cb => (cb.checked = false));
    document.querySelectorAll('.task-card').forEach(c => c.classList.remove('task-selected'));
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    const n   = selectedIds.size;
    bar.classList.toggle('hidden', n === 0);
    if (n > 0) {
        document.getElementById('bulkCount').textContent = `${n} selecionada${n > 1 ? 's' : ''}`;
    }
}

async function bulkChangeStatus(status) {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];
    try {
        await Promise.all(ids.map(id => api('PATCH', `/tasks/${id}/status`, { status })));
        ids.forEach(id => {
            const t = allTasks.find(t => t.id === id);
            if (t) t.status = status;
        });
        toast(`${ids.length} tarefa(s) atualizadas`, 'success');
        renderTasks();
        loadStats();
    } catch {
        toast('Erro na atualização em massa', 'error');
    }
}

async function bulkDelete() {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];
    if (!confirm(`Excluir ${ids.length} tarefa(s) selecionada(s)?`)) return;
    try {
        await Promise.all(ids.map(id => api('DELETE', `/tasks/${id}`)));
        allTasks = allTasks.filter(t => !ids.includes(t.id));
        toast(`${ids.length} tarefa(s) excluídas`, 'info');
        renderTasks();
        loadStats();
    } catch {
        toast('Erro ao excluir', 'error');
    }
}

// --- Troca rápida de status -------------------------------------

async function quickStatus(id, status) {
    try {
        await api('PATCH', `/tasks/${id}/status`, { status });
        const t = allTasks.find(t => t.id === id);
        if (t) t.status = status;
        renderTasks();
        loadStats();
        toast('Status atualizado', 'success', 1800);
    } catch {
        toast('Erro ao atualizar status', 'error');
    }
}

// --- Modal criar / editar ---------------------------------------

function openModal() {
    resetTaskModal();
    document.getElementById('modalTitle').textContent = 'Nova Tarefa';
    document.getElementById('saveTaskBtn').querySelector('.btn-text').textContent = 'Salvar Tarefa';
    document.getElementById('modalOverlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('taskTitle')?.focus(), 50);
}

async function openEditModal(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    resetTaskModal();
    document.getElementById('taskId').value       = task.id;
    document.getElementById('taskTitle').value    = task.title;
    document.getElementById('taskDesc').value     = task.description || '';
    document.getElementById('taskStatus').value   = task.status;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStartDate').value = task.startDate || '';
    document.getElementById('taskEndDate').value   = taskEndDate(task) || '';
    document.getElementById('taskEstimate').value = task.estimatedMinutes || '';
    setTaskPrazoMode(inferPrazoModeFromTask(task));
    await loadCategoriesIntoSelect('taskCategory');
    if (task.categoryId) document.getElementById('taskCategory').value = task.categoryId;
    document.getElementById('modalTitle').textContent = 'Editar Tarefa';
    document.getElementById('saveTaskBtn').querySelector('.btn-text').textContent = 'Atualizar';
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function resetTaskModal() {
    ['taskId', 'taskTitle', 'taskDesc', 'taskStartDate', 'taskEndDate', 'taskEstimate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('taskStatus').value   = 'TODO';
    document.getElementById('taskPriority').value = 'MEDIUM';
    document.getElementById('taskTitleError').textContent = '';
    document.getElementById('modalAlert').classList.add('hidden');
    loadCategoriesIntoSelect('taskCategory');
    setTaskPrazoMode('none');
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
function closeModalOutside(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }

async function handleTaskSubmit(e) {
    e.preventDefault();
    if (isSavingTask) return;
    const id    = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value.trim();
    document.getElementById('taskTitleError').textContent = '';

    if (!title) {
        document.getElementById('taskTitleError').textContent = 'Título é obrigatório';
        document.getElementById('taskTitle').focus();
        return;
    }

    const catVal = document.getElementById('taskCategory').value;
    const estVal = parseInt(document.getElementById('taskEstimate').value, 10);
    const dates = validateAndGetTaskDates();
    if (!dates.ok) {
        const a = document.getElementById('modalAlert');
        a.textContent = dates.message;
        a.className = 'alert error';
        a.classList.remove('hidden');
        return;
    }
    const { startDate, endDate } = dates;

    const body = {
        title,
        description:      document.getElementById('taskDesc').value.trim() || null,
        status:           document.getElementById('taskStatus').value,
        priority:         document.getElementById('taskPriority').value,
        startDate,
        endDate,
        dueDate:          endDate,
        categoryId:       catVal ? Number(catVal) : null,
        estimatedMinutes: Number.isFinite(estVal) && estVal > 0 ? estVal : null,
    };

    isSavingTask = true;
    setLoading('saveTaskBtn', true);
    try {
        if (id) {
            const updated = await api('PUT', `/tasks/${id}`, body);
            const idx = allTasks.findIndex(t => t.id == id);
            if (idx !== -1) allTasks[idx] = updated;
            toast('Tarefa atualizada!', 'success');
        } else {
            const created = await api('POST', '/tasks', body);
            allTasks.unshift(created);
            toast('Tarefa criada!', 'success');
        }
        closeModal();
        renderTasks();
        loadStats();
    } catch (err) {
        const a = document.getElementById('modalAlert');
        a.textContent = err.message; // textContent — nunca innerHTML
        a.className = 'alert error';
        a.classList.remove('hidden');
        await loadTasks();
        loadStats();
    } finally {
        isSavingTask = false;
        setLoading('saveTaskBtn', false);
    }
}

// --- Modal excluir ----------------------------------------------

function openDeleteModal(id) {
    deleteTargetId = id;
    const task = allTasks.find(t => t.id === id);
    // textContent para o nome — nunca innerHTML
    document.getElementById('deleteTaskName').textContent = task ? `"${task.title}"` : '';
    document.getElementById('deleteOverlay').classList.remove('hidden');
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteOverlay').classList.add('hidden');
}

function closeDeleteOutside(e) {
    if (e.target === document.getElementById('deleteOverlay')) closeDeleteModal();
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    const btn = document.getElementById('confirmDeleteBtn');
    btn.disabled = true;
    try {
        await api('DELETE', `/tasks/${deleteTargetId}`);
        allTasks = allTasks.filter(t => t.id !== deleteTargetId);
        toast('Tarefa excluída', 'info');
        closeDeleteModal();
        renderTasks();
        loadStats();
    } catch {
        toast('Erro ao excluir', 'error');
        btn.disabled = false;
    }
}

// --- Modal de detalhe + comentários -----------------------------

async function openDetail(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    detailTaskId = id;

    const statusLabel   = { TODO: 'A Fazer', IN_PROGRESS: 'Em Progresso', DONE: 'Concluída' };
    const priorityLabel = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' };
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const endDate = taskEndDate(task);
    const isOverdue = endDate && task.status !== 'DONE' &&
                      new Date(endDate + 'T00:00:00') < now;

    document.getElementById('detailTitle').textContent = task.title;

    // Badges usando createElement
    const badgesEl = document.getElementById('detailBadges');
    badgesEl.replaceChildren();
    const addBadge = (cls, text) => {
        const s = document.createElement('span');
        s.className = `task-badge ${cls}`;
        s.textContent = text;
        badgesEl.appendChild(s);
    };
    addBadge(`badge-status-${task.status}`, statusLabel[task.status] || task.status);
    addBadge(`badge-priority-${task.priority}`, priorityLabel[task.priority] || task.priority);
    if (task.categoryName) {
        const cs = document.createElement('span');
        cs.className = 'task-badge';
        const color = safeColor(task.categoryColor);
        cs.style.background = color + '22';
        cs.style.color      = color;
        cs.textContent = (task.categoryIcon ? task.categoryIcon + ' ' : '') + task.categoryName;
        badgesEl.appendChild(cs);
    }

    // Meta row com createElement
    const metaRow = document.getElementById('detailMetaRow');
    metaRow.replaceChildren();
    const addMeta = (text, cls = '') => {
        const s = document.createElement('span');
        if (cls) s.className = cls;
        s.textContent = text;
        metaRow.appendChild(s);
    };
    if (endDate) {
        addMeta(
            `📅 Prazo ${formatTaskRange(task)}${isOverdue ? ' (vencida)' : ''}`,
            isOverdue ? 'detail-overdue' : ''
        );
    }
    if (task.estimatedMinutes) addMeta(`⏱ Estimativa: ${fmtMin(task.estimatedMinutes)}`);
    addMeta(`📆 Criada em ${new Date(task.createdAt).toLocaleDateString('pt-BR')}`);

    document.getElementById('detailDescription').textContent = task.description || 'Sem descrição.';
    document.getElementById('detailDescription').style.opacity = task.description ? '1' : '0.4';

    document.getElementById('detailOverlay').classList.remove('hidden');
    loadComments(id);
}

function closeDetail() {
    document.getElementById('detailOverlay').classList.add('hidden');
    detailTaskId = null;
}

function closeDetailOutside(e) {
    if (e.target === document.getElementById('detailOverlay')) closeDetail();
}

function editFromDetail() {
    const id = detailTaskId;
    closeDetail();
    if (id) openEditModal(id);
}

async function loadComments(taskId) {
    const list = document.getElementById('commentsList');
    list.textContent = 'Carregando...';
    try {
        const comments = await api('GET', `/tasks/${taskId}/comments`) || [];
        document.getElementById('commentCount').textContent = comments.length;
        list.replaceChildren();
        if (comments.length === 0) {
            const p = document.createElement('div');
            p.className = 'no-comments';
            p.textContent = 'Sem comentários ainda. Seja o primeiro!';
            list.appendChild(p);
            return;
        }
        comments.forEach(c => list.appendChild(buildCommentEl(c)));
    } catch {
        list.textContent = 'Erro ao carregar comentários.';
    }
}

function buildCommentEl(c) {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    const isMine = String(c.authorId) === String(userId);
    const date   = new Date(c.createdAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'comment-item';
    wrapper.id = `comment-${c.id}`;

    const av = document.createElement('div');
    av.className = 'comment-avatar-sm';
    av.textContent = (c.authorName || '?').charAt(0).toUpperCase();

    const body = document.createElement('div');
    body.className = 'comment-body';

    const meta = document.createElement('div');
    meta.className = 'comment-meta';

    const author = document.createElement('strong');
    author.className = 'comment-author';
    author.textContent = c.authorName || 'Usuário';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'comment-date';
    dateSpan.textContent = date;

    meta.appendChild(author);
    meta.appendChild(dateSpan);

    if (isMine) {
        const delBtn = document.createElement('button');
        delBtn.className = 'comment-delete-btn';
        delBtn.title = 'Excluir comentário';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => deleteComment(c.id));
        meta.appendChild(delBtn);
    }

    const text = document.createElement('p');
    text.className = 'comment-text';
    text.textContent = c.content; // textContent — nunca innerHTML

    body.appendChild(meta);
    body.appendChild(text);
    wrapper.appendChild(av);
    wrapper.appendChild(body);
    return wrapper;
}

async function submitComment(e) {
    e.preventDefault();
    const content = document.getElementById('commentInput').value.trim();
    if (!content || !detailTaskId) return;
    setLoading('commentSubmitBtn', true);
    try {
        await api('POST', `/tasks/${detailTaskId}/comments`, { content });
        document.getElementById('commentInput').value = '';
        await loadComments(detailTaskId);
        const t = allTasks.find(t => t.id === detailTaskId);
        if (t) { t.commentCount = (t.commentCount || 0) + 1; renderTasks(); }
    } catch {
        toast('Erro ao enviar comentário', 'error');
    } finally {
        setLoading('commentSubmitBtn', false);
    }
}

async function deleteComment(commentId) {
    if (!detailTaskId) return;
    try {
        await api('DELETE', `/tasks/${detailTaskId}/comments/${commentId}`);
        document.getElementById(`comment-${commentId}`)?.remove();
        const remaining = document.querySelectorAll('#commentsList .comment-item').length;
        document.getElementById('commentCount').textContent = remaining;
        if (remaining === 0) {
            const p = document.createElement('div');
            p.className = 'no-comments';
            p.textContent = 'Sem comentários ainda. Seja o primeiro!';
            document.getElementById('commentsList').appendChild(p);
        }
        const t = allTasks.find(t => t.id === detailTaskId);
        if (t) { t.commentCount = Math.max(0, (t.commentCount || 1) - 1); renderTasks(); }
    } catch {
        toast('Erro ao excluir comentário', 'error');
    }
}

// --- Exportação -------------------------------------------------

function openExportMenu() {
    const menu = document.getElementById('exportMenu');
    menu.classList.toggle('hidden');
    if (!menu.classList.contains('hidden')) {
        document.addEventListener('click', () => menu.classList.add('hidden'), { once: true });
    }
}

function exportTasks(format) {
    document.getElementById('exportMenu').classList.add('hidden');
    const tasks = visibleTasks();
    if (!tasks.length) { toast('Nenhuma tarefa para exportar', 'warning'); return; }

    const statusLabel   = { TODO: 'A Fazer', IN_PROGRESS: 'Em Progresso', DONE: 'Concluída' };
    const priorityLabel = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' };

    const sanitizeCSV = (str) => {
        let s = (str || '').replace(/"/g, '""');
        if (/^[=\+\-@\t\r]/.test(s)) s = "'" + s;
        return `"${s}"`;
    };

    if (format === 'csv') {
        const header = ['ID', 'Título', 'Descrição', 'Status', 'Prioridade',
                        'Categoria', 'Vencimento', 'Estimativa (min)', 'Criada em'];
        const rows = tasks.map(t => [
            t.id,
            sanitizeCSV(t.title),
            sanitizeCSV(t.description),
            statusLabel[t.status] || t.status,
            priorityLabel[t.priority] || t.priority,
            sanitizeCSV(t.categoryName),
            formatTaskRange(t),
            t.estimatedMinutes || '',
            t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') : '',
        ]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        download('tarefas.csv', '\ufeff' + csv, 'text/csv;charset=utf-8;');
        toast(`${tasks.length} tarefa(s) exportadas como CSV`, 'success');
    } else {
        download('tarefas.json', JSON.stringify(tasks, null, 2), 'application/json');
        toast(`${tasks.length} tarefa(s) exportadas como JSON`, 'success');
    }
}

function download(filename, content, mime) {
    const a  = document.createElement('a');
    a.href   = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
}

// --- Atalhos de teclado -----------------------------------------

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        const tag    = document.activeElement?.tagName;
        const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
            closeDetail();
            closeShortcuts();
            return;
        }
        if (typing) return;

        switch (e.key) {
            case 'n': case 'N': openModal(); break;
            case 'k': case 'K': window.location.href = 'kanban.html'; break;
            case '/':
                e.preventDefault();
                document.getElementById('searchInput')?.focus();
                break;
            case '?':
                document.getElementById('shortcutsOverlay').classList.remove('hidden');
                break;
            case '1': filterByStatus('ALL');         break;
            case '2': filterByStatus('TODO');        break;
            case '3': filterByStatus('IN_PROGRESS'); break;
            case '4': filterByStatus('DONE');        break;
        }
    });
}

function closeShortcuts() {
    document.getElementById('shortcutsOverlay').classList.add('hidden');
}

// --- Estado de carregamento ------------------------------------

function showLoading(show) {
    document.getElementById('loadingState').classList.toggle('hidden', !show);
    document.getElementById('taskGrid').classList.toggle('hidden', show);
}

// --- Helpers ---------------------------------------------------

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
