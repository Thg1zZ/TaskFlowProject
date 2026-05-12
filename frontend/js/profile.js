// profile.js - depende de shared.js (api, toast, setLoading)

let profileImageData = '';
let profileStats = {};
let statsChart = null;
let cropperInstance = null;

const chartDefaults = {
    type: localStorage.getItem('profileChartType') || 'doughnut',
    barHorizontal: localStorage.getItem('profileChartBarH') === '1',
    colors: {
        todo: localStorage.getItem('profileColorTodo') || '#f59e0b',
        progress: localStorage.getItem('profileColorProgress') || '#3b82f6',
        done: localStorage.getItem('profileColorDone') || '#22d3a5',
    },
};

document.addEventListener('DOMContentLoaded', () => {
    setupProfileImageInput();
    setupChartControls();
    loadProfile();
    
    // Bindings
    document.getElementById('profileForm')?.addEventListener('submit', updateProfile);
    document.getElementById('passwordForm')?.addEventListener('submit', updatePassword);
    document.getElementById('btnRemovePhoto')?.addEventListener('click', removeProfileImage);
    document.getElementById('btnRotateLeft')?.addEventListener('click', () => rotateCropper(-90));
    document.getElementById('btnRotateRight')?.addEventListener('click', () => rotateCropper(90));
    document.getElementById('btnZoomIn')?.addEventListener('click', () => zoomCropper(0.1));
    document.getElementById('btnZoomOut')?.addEventListener('click', () => zoomCropper(-0.1));
    document.querySelectorAll('.btn-close-crop-modal').forEach(btn => btn.addEventListener('click', closeCropModal));
    document.getElementById('btnConfirmCrop')?.addEventListener('click', confirmCrop);
});

async function loadProfile() {
    try {
        const data = await api('GET', '/users/me');
        populateProfile(data);
    } catch {
        toast('Erro ao carregar perfil', 'error');
    }
}

function populateProfile(data) {
    const initials = (data.name || '?').charAt(0).toUpperCase();
    profileImageData = data.profileImage || '';
    if (profileImageData) sessionStorage.setItem('userProfileImage', profileImageData);
    else sessionStorage.removeItem('userProfileImage');

    setAvatar(document.getElementById('profileAvatarBig'), data.name, profileImageData);
    setAvatar(document.getElementById('profilePhotoPreview'), data.name, profileImageData);
    document.getElementById('profileName').textContent = data.name || '—';
    document.getElementById('profileJobTitle').textContent = data.jobTitle || 'Sem cargo definido';
    document.getElementById('profileBio').textContent = data.bio || 'Sem bio ainda.';

    const since = data.createdAt
        ? new Date(data.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : '—';
    document.getElementById('profileSince').textContent = since;

    document.getElementById('editName').value = data.name || '';
    document.getElementById('editJobTitle').value = data.jobTitle || '';
    document.getElementById('editBio').value = data.bio || '';

    profileStats = data.stats || {};
    document.getElementById('ps-total').textContent = profileStats.total || 0;
    document.getElementById('ps-done').textContent = profileStats.done || 0;
    document.getElementById('ps-rate').textContent = (profileStats.completionRate || 0) + '%';
    renderStatsChart();
}

function setupProfileImageInput() {
    const input = document.getElementById('profileImageInput');
    if (!input) return;

    input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        const err = document.getElementById('profileImageErr');
        err.textContent = '';
        if (!file) return;

        // Validar formato
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            input.value = '';
            err.textContent = 'Formato inválido. Use JPG, PNG ou WebP.';
            return;
        }

        // Limite de 5 MB
        if (file.size > 5 * 1024 * 1024) {
            input.value = '';
            err.textContent = 'Imagem muito grande. Use até 5 MB.';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const cropTarget = document.getElementById('cropImageTarget');
            cropTarget.src = e.target.result;
            
            // Mostrar modal
            document.getElementById('cropModalOverlay').classList.remove('hidden');
            
            // Se já existia um cropper, destrói
            if (cropperInstance) {
                cropperInstance.destroy();
            }

            // Inicializar Cropper.js
            cropperInstance = new Cropper(cropTarget, {
                aspectRatio: 1, // Quadrado (vai ficar circular via CSS)
                viewMode: 1, // Restringe a crop box ao tamanho do canvas
                dragMode: 'move', // Permite arrastar a imagem
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
    });
}

function closeCropModal() {
    document.getElementById('cropModalOverlay').classList.add('hidden');
    const input = document.getElementById('profileImageInput');
    if (input) input.value = '';
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
}

function rotateCropper(degree) {
    if (cropperInstance) {
        cropperInstance.rotate(degree);
    }
}

function zoomCropper(ratio) {
    if (cropperInstance) {
        cropperInstance.zoom(ratio);
    }
}

function confirmCrop() {
    if (!cropperInstance) return;

    // Pega o canvas com a imagem recortada (tamanho 400x400 garantindo qualidade)
    const canvas = cropperInstance.getCroppedCanvas({
        width: 400,
        height: 400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });

    // Converte para JPEG
    profileImageData = canvas.toDataURL('image/jpeg', 0.85);

    // Atualiza avatares na tela
    const name = document.getElementById('editName').value;
    setAvatar(document.getElementById('profilePhotoPreview'), name, profileImageData);
    setAvatar(document.getElementById('profileAvatarBig'), name, profileImageData);

    closeCropModal();
}

function removeProfileImage() {
    profileImageData = '';
    document.getElementById('profileImageInput').value = '';
    setAvatar(document.getElementById('profilePhotoPreview'), document.getElementById('editName').value, '');
    setAvatar(document.getElementById('profileAvatarBig'), document.getElementById('editName').value, '');
}

function chartGridColor() {
    const t = document.documentElement.getAttribute('data-theme');
    return t === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.18)';
}

function chartTickColor() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim();
    return v || '#94a3b8';
}

function hexToRgba(hex, alpha) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return `rgba(59, 130, 246, ${alpha})`;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

function doughnutBorderColor() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--bg-2').trim();
    return v || '#0f172a';
}

function updateBarHorizontalVisibility() {
    const wrap = document.getElementById('chartBarHorizontalWrap');
    const sel = document.getElementById('chartTypeSelect').value;
    if (!wrap) return;
    const show = sel === 'bar' || sel === 'histogram';
    wrap.classList.toggle('hidden', !show);
}

function setupChartControls() {
    const typeSel = document.getElementById('chartTypeSelect');
    const barH = document.getElementById('chartBarHorizontal');

    typeSel.value = chartDefaults.type;
    if (barH) barH.checked = chartDefaults.barHorizontal;

    document.getElementById('colorTodo').value = chartDefaults.colors.todo;
    document.getElementById('colorProgress').value = chartDefaults.colors.progress;
    document.getElementById('colorDone').value = chartDefaults.colors.done;

    typeSel.addEventListener('change', () => {
        localStorage.setItem('profileChartType', typeSel.value);
        updateBarHorizontalVisibility();
        renderStatsChart();
    });

    if (barH) {
        barH.addEventListener('change', () => {
            localStorage.setItem('profileChartBarH', barH.checked ? '1' : '0');
            renderStatsChart();
        });
    }

    [
        ['colorTodo', 'profileColorTodo'],
        ['colorProgress', 'profileColorProgress'],
        ['colorDone', 'profileColorDone'],
    ].forEach(([id, key]) => {
        document.getElementById(id).addEventListener('input', e => {
            localStorage.setItem(key, e.target.value);
            renderStatsChart();
        });
    });

    updateBarHorizontalVisibility();
}

function renderStatsChart() {
    if (!window.Chart) return;

    const type = document.getElementById('chartTypeSelect').value;
    const colors = [
        document.getElementById('colorTodo').value,
        document.getElementById('colorProgress').value,
        document.getElementById('colorDone').value,
    ];
    const values = [
        Number(profileStats.todo || 0),
        Number(profileStats.inProgress || 0),
        Number(profileStats.done || 0),
    ];
    const labels = ['A Fazer', 'Em Progresso', 'Concluídas'];
    const ctx = document.getElementById('profileStatsChart');
    const grid = chartGridColor();
    const ticks = chartTickColor();
    const horizontal = document.getElementById('chartBarHorizontal')?.checked;

    if (statsChart) statsChart.destroy();

    const common = {
        responsive: true,
        maintainAspectRatio: false,
    };

    let config;

    if (type === 'doughnut') {
        config = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor: doughnutBorderColor(),
                    hoverOffset: 10,
                }],
            },
            options: {
                ...common,
                cutout: '56%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: ticks, padding: 14, font: { size: 12 } },
                    },
                },
            },
        };
    } else if (type === 'bar' || type === 'histogram') {
        const isHist = type === 'histogram';
        config = {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: isHist ? 'Frequência (tarefas)' : 'Quantidade',
                    data: values,
                    backgroundColor: isHist ? colors.map(c => hexToRgba(c, 0.82)) : colors,
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: isHist ? 2 : 8,
                    barPercentage: isHist ? 0.85 : 0.65,
                }],
            },
            options: {
                ...common,
                indexAxis: horizontal ? 'y' : 'x',
                plugins: {
                    legend: { display: isHist, position: 'bottom', labels: { color: ticks } },
                },
                scales: horizontal
                    ? {
                        x: { beginAtZero: true, ticks: { precision: 0, color: ticks }, grid: { color: grid } },
                        y: { ticks: { color: ticks }, grid: { display: false } },
                    }
                    : {
                        x: { ticks: { color: ticks }, grid: { display: false } },
                        y: { beginAtZero: true, ticks: { precision: 0, color: ticks }, grid: { color: grid } },
                    },
            },
        };
    } else if (type === 'line' || type === 'area') {
        config = {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Tarefas',
                    data: values,
                    fill: type === 'area',
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 8,
                    pointHoverRadius: 11,
                    pointBackgroundColor: colors,
                    pointBorderColor: colors,
                    pointBorderWidth: 2,
                    borderColor: colors[1],
                    backgroundColor: type === 'area' ? hexToRgba(colors[1], 0.22) : 'transparent',
                }],
            },
            options: {
                ...common,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: ticks }, grid: { color: grid } },
                    y: { beginAtZero: true, ticks: { precision: 0, color: ticks }, grid: { color: grid } },
                },
            },
        };
    } else if (type === 'scatter') {
        config = {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Tarefas',
                    data: values.map((y, i) => ({ x: i, y })),
                    backgroundColor: colors,
                    borderColor: colors.map(c => hexToRgba(c, 0.95)),
                    borderWidth: 2,
                    pointRadius: 13,
                    pointHoverRadius: 16,
                }],
            },
            options: {
                ...common,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        type: 'linear',
                        min: -0.35,
                        max: 2.35,
                        ticks: {
                            stepSize: 1,
                            callback(val) {
                                const i = Math.round(Number(val));
                                return labels[i] !== undefined ? labels[i] : '';
                            },
                            color: ticks,
                        },
                        grid: { color: grid },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0, color: ticks },
                        grid: { color: grid },
                    },
                },
            },
        };
    } else {
        config = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: doughnutBorderColor() }],
            },
            options: { ...common, cutout: '56%', plugins: { legend: { display: true, position: 'bottom' } } },
        };
    }

    statsChart = new Chart(ctx, config);
}

document.getElementById('profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('editName').value.trim();

    document.getElementById('editNameErr').textContent = '';
    if (!name || name.length < 2) {
        document.getElementById('editNameErr').textContent = 'Nome deve ter pelo menos 2 caracteres';
        return;
    }

    setLoading('saveProfileBtn', true);
    try {
        const data = await api('PUT', '/users/me', {
            name,
            jobTitle: document.getElementById('editJobTitle').value.trim() || null,
            bio: document.getElementById('editBio').value.trim() || null,
            profileImage: profileImageData || null,
        });

        sessionStorage.setItem('userName', data.name);
        if (data.profileImage) sessionStorage.setItem('userProfileImage', data.profileImage);
        else sessionStorage.removeItem('userProfileImage');

        document.getElementById('userName').textContent = data.name;
        setAvatar(document.getElementById('userAvatar'), data.name, data.profileImage);

        toast('Perfil atualizado!', 'success');
        await loadProfile();
    } catch (err) {
        const alertEl = document.getElementById('profileAlert');
        alertEl.textContent = err.message;
        alertEl.className = 'alert error';
        alertEl.classList.remove('hidden');
    } finally {
        setLoading('saveProfileBtn', false);
    }
});

document.getElementById('passwordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const currentPwd = document.getElementById('currentPwd').value;
    const newPwd = document.getElementById('newPwd').value;
    const confirmPwd = document.getElementById('confirmPwd').value;

    ['currentPwdErr', 'newPwdErr', 'confirmPwdErr'].forEach(id => {
        document.getElementById(id).textContent = '';
    });

    let valid = true;
    if (!currentPwd) {
        document.getElementById('currentPwdErr').textContent = 'Informe a senha atual';
        valid = false;
    }
    if (!newPwd || newPwd.length < 6) {
        document.getElementById('newPwdErr').textContent = 'Mínimo de 6 caracteres';
        valid = false;
    }
    if (currentPwd && newPwd && currentPwd === newPwd) {
        document.getElementById('newPwdErr').textContent = 'A nova senha deve ser diferente da atual';
        valid = false;
    }
    if (newPwd !== confirmPwd) {
        document.getElementById('confirmPwdErr').textContent = 'As senhas não coincidem';
        valid = false;
    }
    if (!valid) return;

    setLoading('savePwdBtn', true);
    try {
        await api('PATCH', '/users/me/password', {
            currentPassword: currentPwd,
            newPassword: newPwd,
        });
        document.getElementById('passwordForm').reset();
        document.getElementById('passwordAlert').classList.add('hidden');
        toast('Senha alterada com sucesso!', 'success');
    } catch (err) {
        const alertEl = document.getElementById('passwordAlert');
        alertEl.textContent = err.message;
        alertEl.className = 'alert error';
        alertEl.classList.remove('hidden');
    } finally {
        setLoading('savePwdBtn', false);
    }
});
