// admin.js - Depende de shared.js (api, toast, setLoading, escHtml)

let userToDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Garantir proteção no cliente se por algum motivo shared.js não redirecionar
    if (sessionStorage.getItem('userRole') !== 'ROLE_ADMIN') {
        window.location.href = 'dashboard.html';
        return;
    }

    loadStats();
    loadUsers();

    // Bindings de modal
    document.getElementById('btnCloseDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('btnCancelDelete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmDeleteUser')?.addEventListener('click', confirmDeleteUser);
});

async function loadStats() {
    try {
        const stats = await api('GET', '/admin/stats');
        document.getElementById('statsTotalUsers').textContent = stats.totalUsers ?? 0;
        document.getElementById('statsTotalTasks').textContent = stats.totalTasks ?? 0;
    } catch (err) {
        toast('Erro ao carregar estatísticas do sistema', 'error');
    }
}

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    try {
        const users = await api('GET', '/admin/users');
        tbody.replaceChildren();

        if (!users || users.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 7;
            td.style.padding = '32px';
            td.style.textAlign = 'center';
            td.style.color = 'var(--text-3)';
            td.textContent = 'Nenhum usuário cadastrado no sistema.';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        const currentUserId = Number(sessionStorage.getItem('userId'));

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.style.color = 'var(--text-1)';
            tr.className = 'table-row-hover'; // Efeito de hover suave

            // Nome (com Avatar pequeno)
            const tdName = document.createElement('td');
            tdName.style.padding = '14px 16px';
            tdName.style.display = 'flex';
            tdName.style.alignItems = 'center';
            tdName.style.gap = '10px';

            const av = document.createElement('div');
            av.className = 'user-avatar';
            av.style.width = '30px';
            av.style.height = '30px';
            av.style.fontSize = '12px';
            av.style.flexShrink = '0';
            setAvatar(av, u.name, u.profileImage);

            const nameText = document.createElement('span');
            nameText.style.fontWeight = '500';
            nameText.textContent = u.name;

            tdName.appendChild(av);
            tdName.appendChild(nameText);

            // Email
            const tdEmail = document.createElement('td');
            tdEmail.style.padding = '14px 16px';
            tdEmail.style.color = 'var(--text-2)';
            tdEmail.textContent = u.email;

            // Job Title
            const tdJob = document.createElement('td');
            tdJob.style.padding = '14px 16px';
            tdJob.style.color = 'var(--text-2)';
            tdJob.textContent = u.jobTitle || '—';

            // Perfil / Acesso
            const tdRole = document.createElement('td');
            tdRole.style.padding = '14px 16px';
            
            const badge = document.createElement('span');
            badge.style.padding = '4px 8px';
            badge.style.borderRadius = '20px';
            badge.style.fontSize = '11px';
            badge.style.fontWeight = '600';
            if (u.role === 'ROLE_ADMIN') {
                badge.style.background = 'rgba(59, 130, 246, 0.15)';
                badge.style.color = 'var(--accent-blue)';
                badge.textContent = 'ADMIN';
            } else {
                badge.style.background = 'rgba(148, 163, 184, 0.15)';
                badge.style.color = 'var(--text-2)';
                badge.textContent = 'USUÁRIO';
            }
            tdRole.appendChild(badge);

            // Total de tarefas
            const tdTasks = document.createElement('td');
            tdTasks.style.padding = '14px 16px';
            tdTasks.style.color = 'var(--text-2)';
            tdTasks.style.fontWeight = '500';
            tdTasks.textContent = u.taskCount ?? 0;

            // Membro desde
            const tdSince = document.createElement('td');
            tdSince.style.padding = '14px 16px';
            tdSince.style.color = 'var(--text-3)';
            tdSince.textContent = u.createdAt 
                ? new Date(u.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';

            // Ações (Botão Deletar)
            const tdActions = document.createElement('td');
            tdActions.style.padding = '14px 16px';
            tdActions.style.textAlign = 'right';

            const btnDel = document.createElement('button');
            btnDel.className = 'btn-ghost';
            btnDel.style.padding = '6px 12px';
            btnDel.style.fontSize = '12px';
            btnDel.style.borderRadius = '6px';
            btnDel.textContent = 'Excluir';

            // Bloqueio de auto-exclusão no frontend
            if (u.id === currentUserId) {
                btnDel.disabled = true;
                btnDel.style.opacity = '0.4';
                btnDel.title = 'Você não pode excluir sua própria conta';
                btnDel.style.cursor = 'not-allowed';
            } else if (u.role === 'ROLE_ADMIN') {
                btnDel.disabled = true;
                btnDel.style.opacity = '0.4';
                btnDel.title = 'Exclusão de outros administradores não permitida';
                btnDel.style.cursor = 'not-allowed';
            } else {
                btnDel.style.color = 'var(--accent-red)';
                btnDel.style.background = 'rgba(239, 68, 68, 0.05)';
                btnDel.addEventListener('click', () => openDeleteModal(u.id, u.name));
            }

            tdActions.appendChild(btnDel);

            tr.appendChild(tdName);
            tr.appendChild(tdEmail);
            tr.appendChild(tdJob);
            tr.appendChild(tdRole);
            tr.appendChild(tdTasks);
            tr.appendChild(tdSince);
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });

    } catch (err) {
        tbody.replaceChildren();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.style.padding = '32px';
        td.style.textAlign = 'center';
        td.style.color = 'var(--accent-red)';
        td.textContent = 'Falha ao carregar a lista de usuários do servidor.';
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}

function openDeleteModal(userId, userName) {
    userToDeleteId = userId;
    document.getElementById('deleteTargetName').textContent = userName;
    document.getElementById('deleteUserModal').classList.remove('hidden');
}

function closeDeleteModal() {
    userToDeleteId = null;
    document.getElementById('deleteUserModal').classList.add('hidden');
}

async function confirmDeleteUser() {
    if (!userToDeleteId) return;

    setLoading('btnConfirmDeleteUser', true);
    try {
        await api('DELETE', `/admin/users/${userToDeleteId}`);
        toast('Usuário excluído do sistema com sucesso!', 'success');
        closeDeleteModal();
        loadStats();
        loadUsers();
    } catch (err) {
        toast(err.message || 'Erro ao tentar excluir o usuário', 'error');
    } finally {
        setLoading('btnConfirmDeleteUser', false);
    }
}
