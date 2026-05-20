// calendar.js — depende de shared.js (api, toast, setLoading, escHtml, safeColor)

let allTasks       = [];
let currentDate    = new Date(); // Mês atual visualizado
let deleteTargetId = null;
let detailTaskId   = null;
let isSavingTask   = false;

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// --- Inicialização ----------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    setupKeyboardShortcuts();
    setupTaskPrazoModeListeners();
    await loadCategoriesIntoSelect('taskCategory');
    await loadTasks();
});

function setupEventListeners() {
    // Paginação do Calendário
    document.getElementById('btnPrevMonth')?.addEventListener('click', prevMonth);
    document.getElementById('btnNextMonth')?.addEventListener('click', nextMonth);
    document.getElementById('btnToday')?.addEventListener('click', goToToday);

    // Eventos Globais de Criação de Tarefa
    document.querySelectorAll('.btn-new-task').forEach(btn => btn.addEventListener('click', () => openModal()));
    document.querySelectorAll('.btn-close-modal').forEach(btn => btn.addEventListener('click', closeModal));
    document.querySelectorAll('.btn-close-detail').forEach(btn => btn.addEventListener('click', closeDetail));
    document.querySelectorAll('.btn-close-delete').forEach(btn => btn.addEventListener('click', closeDeleteModal));
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
    
    // Submissão do Formulário de Tarefa
    document.getElementById('taskForm')?.addEventListener('submit', handleTaskSubmit);

    // Detalhe / Editar / Comentários
    document.getElementById('detailEditBtn')?.addEventListener('click', editFromDetail);
    document.getElementById('commentForm')?.addEventListener('submit', submitComment);

    // Fechar modais ao clicar fora
    document.getElementById('modalOverlay')?.addEventListener('click', closeModalOutside);
    document.getElementById('detailOverlay')?.addEventListener('click', closeDetailOutside);
    document.getElementById('deleteOverlay')?.addEventListener('click', closeDeleteOutside);
    document.getElementById('shortcutsOverlay')?.addEventListener('click', closeShortcutsOutside);
}

// --- Dados e Carga ----------------------------------------------

async function loadTasks() {
    try {
        allTasks = await api('GET', '/tasks') || [];
        renderCalendar();
    } catch {
        toast('Erro ao carregar tarefas', 'error');
    }
}

// --- Paginação do Calendário ------------------------------------

function prevMonth() {
    currentDate.setDate(1); // Blindagem contra estouro de dias (ex: 31 de Julho -> 31 de Junho = estouro para Julho)
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setDate(1); // Blindagem contra estouro de dias (ex: 31 de Janeiro -> 31 de Fevereiro = estouro para Março)
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

// --- Renderização do Calendário ---------------------------------

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Atualiza o Título do Mês
    const titleEl = document.getElementById('calendarMonthTitle');
    if (titleEl) {
        titleEl.textContent = `${MONTH_NAMES[month]} de ${year}`;
    }

    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;
    grid.replaceChildren();

    // ⚡ Otimização O(N): Pré-indexar tarefas por data (incluindo intervalos)
    const tasksIndexedByDate = {};
    allTasks.forEach(task => {
        const start = task.startDate;
        const end = task.endDate || task.dueDate;

        if (start && end) {
            // É um intervalo. Varremos cada dia do intervalo de forma segura.
            let current = new Date(start + 'T00:00:00');
            const stop = new Date(end + 'T00:00:00');
            // Proteção contra loops infinitos caso a data de início seja maior que a de fim por erro
            if (current <= stop) {
                while (current <= stop) {
                    const y = current.getFullYear();
                    const m = String(current.getMonth() + 1).padStart(2, '0');
                    const d = String(current.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${d}`;
                    if (!tasksIndexedByDate[dateStr]) {
                        tasksIndexedByDate[dateStr] = [];
                    }
                    tasksIndexedByDate[dateStr].push(task);
                    current.setDate(current.getDate() + 1);
                }
            }
        } else if (end) {
            if (!tasksIndexedByDate[end]) tasksIndexedByDate[end] = [];
            tasksIndexedByDate[end].push(task);
        } else if (start) {
            if (!tasksIndexedByDate[start]) tasksIndexedByDate[start] = [];
            tasksIndexedByDate[start].push(task);
        }
    });

    // Primeiras contas de data
    const firstDayIndex = new Date(year, month, 1).getDay(); // Dia da semana do 1º dia (0=Dom, 6=Sáb)
    const totalDays = new Date(year, month + 1, 0).getDate(); // Dias no mês atual
    const prevTotalDays = new Date(year, month, 0).getDate(); // Dias no mês anterior

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Dias residuais do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevTotalDays - i;
        const cellDate = new Date(year, month - 1, dayNum);
        grid.appendChild(createDayCell(cellDate, true, today, tasksIndexedByDate));
    }

    // 2. Dias do mês atual
    for (let d = 1; d <= totalDays; d++) {
        const cellDate = new Date(year, month, d);
        grid.appendChild(createDayCell(cellDate, false, today, tasksIndexedByDate));
    }

    // 3. Dias residuais do próximo mês até fechar 42 células (6 linhas completas)
    const currentCellsCount = grid.children.length;
    const remainingCells = 42 - currentCellsCount;
    for (let d = 1; d <= remainingCells; d++) {
        const cellDate = new Date(year, month + 1, d);
        grid.appendChild(createDayCell(cellDate, true, today, tasksIndexedByDate));
    }
}

function createDayCell(date, isOtherMonth, today, tasksIndexedByDate) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (isOtherMonth) {
        cell.classList.add('other-month');
    }

    // Identifica se é hoje
    const compDate = new Date(date);
    compDate.setHours(0,0,0,0);
    if (compDate.getTime() === today.getTime()) {
        cell.classList.add('today');
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    // Header da célula
    const header = document.createElement('div');
    header.className = 'calendar-cell-header';

    const numSpan = document.createElement('span');
    numSpan.className = 'calendar-day-num';
    numSpan.textContent = date.getDate();
    header.appendChild(numSpan);

    // Botão de Adição Rápida
    const addBtn = document.createElement('button');
    addBtn.className = 'calendar-add-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Nova tarefa para este dia';
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModalWithDate(dateStr);
    });
    header.appendChild(addBtn);

    cell.appendChild(header);

    // Lista de Tarefas do dia
    const tasksList = document.createElement('div');
    tasksList.className = 'calendar-tasks-list';

    // ⚡ Acesso O(1) de tarefas filtradas e mapeadas por dia
    const tasksForDay = [...(tasksIndexedByDate[dateStr] || [])];

    // Ordenar tarefas no dia: prioritárias e depois concluídas
    tasksForDay.sort((a, b) => {
        if (a.status === 'DONE' && b.status !== 'DONE') return 1;
        if (a.status !== 'DONE' && b.status === 'DONE') return -1;
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.priority] - order[b.priority];
    });

    tasksForDay.forEach(task => {
        const pill = document.createElement('button');
        pill.className = `calendar-task-pill priority-${task.priority}`;
        if (task.status === 'DONE') {
            pill.classList.add('done');
        }

        // Estilização customizada da categoria caso possua
        const catColor = safeColor(task.categoryColor);
        if (task.categoryName) {
            pill.style.background = `${catColor}22`;
            pill.style.color = catColor;
            pill.style.borderColor = `${catColor}44`;
        }

        pill.textContent = (task.categoryIcon ? task.categoryIcon + ' ' : '') + task.title;
        pill.title = `${task.title} (${priorityLabel(task.priority)})`;

        // Clique na pílula abre os detalhes
        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            openDetail(task.id);
        });

        tasksList.appendChild(pill);
    });

    cell.appendChild(tasksList);
    return cell;
}

// --- Criação / Edição de Tarefas (Modais) -----------------------

function openModal() {
    resetTaskModal();
    document.getElementById('modalTitle').textContent = 'Nova Tarefa';
    document.getElementById('saveTaskBtn').querySelector('.btn-text').textContent = 'Salvar Tarefa';
    document.getElementById('modalOverlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('taskTitle')?.focus(), 50);
}

function openModalWithDate(dateStr) {
    resetTaskModal();
    document.getElementById('taskEndDate').value = dateStr;
    setTaskPrazoMode('single');
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

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

function closeModalOutside(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
}

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
            await api('PUT', `/tasks/${id}`, body);
            toast('Tarefa atualizada!', 'success');
        } else {
            await api('POST', '/tasks', body);
            toast('Tarefa criada!', 'success');
        }
        closeModal();
        await loadTasks();
    } catch (err) {
        const a = document.getElementById('modalAlert');
        a.textContent = err.message;
        a.className = 'alert error';
        a.classList.remove('hidden');
    } finally {
        isSavingTask = false;
        setLoading('saveTaskBtn', false);
    }
}

// --- Detalhes da Tarefa & Comentários ---------------------------

async function openDetail(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    detailTaskId = id;

    const statusLabel   = { TODO: 'A Fazer', IN_PROGRESS: 'Em Progresso', DONE: 'Concluída' };
    const priorityLabelText = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' };
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
    addBadge(`badge-priority-${task.priority}`, priorityLabelText[task.priority] || task.priority);

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

    renderDetailTimeTracking(task, openDetail);

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
    if (!list) return;
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
    text.textContent = c.content;

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
        await loadTasks(); // recarrega contador na pílula do calendário
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
        await loadTasks(); // recarrega contador
    } catch {
        toast('Erro ao excluir comentário', 'error');
    }
}

// --- Exclusão de Tarefas ----------------------------------------

function openDeleteModal(id) {
    deleteTargetId = id;
    const task = allTasks.find(t => t.id === id);
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
        toast('Tarefa excluída', 'info');
        closeDeleteModal();
        closeDetail();
        await loadTasks();
    } catch {
        toast('Erro ao excluir', 'error');
        btn.disabled = false;
    }
}

// --- Helpers ----------------------------------------------------

function priorityLabel(priority) {
    return { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' }[priority] || priority || 'Prioridade';
}

// --- Atalhos de Teclado -----------------------------------------

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
            case 'd': case 'D': window.location.href = 'dashboard.html'; break;
            case '?':
                document.getElementById('shortcutsOverlay')?.classList.remove('hidden');
                break;
        }
    });
}

function closeShortcuts() {
    document.getElementById('shortcutsOverlay')?.classList.add('hidden');
}

function closeShortcutsOutside(e) {
    if (e.target === document.getElementById('shortcutsOverlay')) closeShortcuts();
}

window.addEventListener('taskTimeUpdated', (e) => {
    const { taskId, timeSpentMinutes } = e.detail;
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
        task.timeSpentMinutes = timeSpentMinutes;
        if (detailTaskId === taskId) {
            openDetail(taskId);
        }
    }
    renderCalendar();
});
