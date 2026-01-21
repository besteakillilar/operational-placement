// ==================== CONFIGURATION ====================
// Google Apps Script Web App URL'nizi buraya yapıştırın
const API_URL = 'https://script.google.com/macros/s/AKfycbzXqRjdnp38Kj7Ap5s7sc6aOncp2XJCnk5akD_RvkEM-6Nqz7EJ1W_HjH3_wdzpdJDseQ/exec';

// ==================== GLOBAL DATA ====================
let personnel = [];
let leaves = [];
let departments = [];
let tasks = [];
let leaveTypes = [];
let currentUser = null;

// ==================== API FUNCTIONS ====================
async function apiCall(action, data = null) {
    try {
        let url = `${API_URL}?action=${action}`;
        if (data) {
            url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'API hatası');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

async function apiPost(action, data = null, id = null) {
    try {
        let url = `${API_URL}?action=${action}`;
        if (data) {
            url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
        }
        if (id) {
            url += `&id=${encodeURIComponent(id)}`;
        }

        const response = await fetch(url, { method: 'POST' });
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'API hatası');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

async function loadAllData(showOverlay = true) {
    if (showOverlay) showLoading(true);
    try {
        const result = await apiCall('getAllData');
        personnel = result.data.personnel || [];
        leaves = result.data.leaves || [];
        departments = result.data.departments || [];
        tasks = result.data.tasks || [];
        leaveTypes = result.data.leaveTypes || [];

        // DATA MIGRATION: Update old department/task names to new format
        personnel.forEach(p => {
            // Update Department Name
            if (p.department === 'Balon Tedarik') {
                p.department = 'Balon Tedarik - Sevkiyat';
            }

            // Update Task Names
            if (p.task === 'Kalite Kontrol') p.task = 'Kalite Kontrol - Paketleme';
            if (p.task === 'Numune') p.task = 'Numune - Paketleme';
            if (p.task === 'TR Reklamlık/Paketleme') p.task = 'TR Reklamlık - Paketleme';
            if (p.task === 'Stok/Sevkiyat/Tedarik') p.task = 'Stok - Sevkiyat - Tedarik';
        });

        // Update departments array if it contains old name
        departments = departments.map(d => d === 'Balon Tedarik' ? 'Balon Tedarik - Sevkiyat' : d);

        // Update tasks array if it contains old department name
        tasks.forEach(t => {
            if (t.department === 'Balon Tedarik') {
                t.department = 'Balon Tedarik - Sevkiyat';
            }
        });

        // Fallback to defaults if empty
        if (departments.length === 0) {
            departments = ['Paketleme', 'Balon Tedarik - Sevkiyat'];
        }
        if (tasks.length === 0) {
            tasks = [
                { department: 'Paketleme', task: 'Sorumlu' },
                { department: 'Paketleme', task: 'Kalite Kontrol - Paketleme' },
                { department: 'Paketleme', task: 'Numune - Paketleme' },
                { department: 'Paketleme', task: 'TR Reklamlık - Paketleme' },
                { department: 'Paketleme', task: 'Paketleme Çıkış' },
                { department: 'Paketleme', task: 'Paketleme' },
                { department: 'Paketleme', task: 'Paketleme Tartım' },
                { department: 'Balon Tedarik - Sevkiyat', task: 'Stok - Sevkiyat - Tedarik' },
                { department: 'Balon Tedarik - Sevkiyat', task: 'Tedarik' },
                { department: 'Balon Tedarik - Sevkiyat', task: 'Sevkiyat Hazırlık' },
                { department: 'Balon Tedarik - Sevkiyat', task: 'Dolum' }
            ];
        }
        if (leaveTypes.length === 0) {
            leaveTypes = [
                'Geç Gelecek', 'Saatlik İzinli', 'Günlük İzinli', 'Yıllık İzinli',
                'Mazeretsiz Gelmedi', 'Doğum İzni', 'Raporlu', 'Erken Çıktı'
            ];
        }

        if (showOverlay) showToast('Veriler yüklendi', 'success');
    } catch (error) {
        console.error('Load error:', error);
        // Use local fallback data
        departments = ['Paketleme', 'Balon Tedarik - Sevkiyat'];
        tasks = [
            { department: 'Paketleme', task: 'Sorumlu' },
            { department: 'Paketleme', task: 'Kalite Kontrol - Paketleme' },
            { department: 'Paketleme', task: 'Numune - Paketleme' },
            { department: 'Paketleme', task: 'TR Reklamlık - Paketleme' },
            { department: 'Paketleme', task: 'Paketleme Çıkış' },
            { department: 'Paketleme', task: 'Paketleme' },
            { department: 'Paketleme', task: 'Paketleme Tartım' },
            { department: 'Balon Tedarik - Sevkiyat', task: 'Stok - Sevkiyat - Tedarik' },
            { department: 'Balon Tedarik - Sevkiyat', task: 'Tedarik' },
            { department: 'Balon Tedarik - Sevkiyat', task: 'Sevkiyat Hazırlık' },
            { department: 'Balon Tedarik - Sevkiyat', task: 'Dolum' }
        ];
        leaveTypes = [
            'Geç Gelecek', 'Saatlik İzinli', 'Günlük İzinli', 'Yıllık İzinli',
            'Mazeretsiz Gelmedi', 'Doğum İzni', 'Raporlu', 'Erken Çıktı'
        ];
    }
    if (showOverlay) showLoading(false);
}

// ==================== THEME TOGGLE ====================
function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';

    // Apply saved theme on load
    document.documentElement.setAttribute('data-theme', savedTheme);

    toggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Update Flatpickr theme if instances exist
        updateFlatpickrTheme(newTheme);
    });
}

function updateFlatpickrTheme(theme) {
    // Flatpickr instances will pick up CSS changes automatically
    // This function can be extended if needed
}

// ==================== UTILITY FUNCTIONS ====================
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Buton üzerinde loading göster (tam sayfa yerine)
function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<span class="btn-spinner"></span> İşleniyor...';
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// Toast bildirimi göster
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getDaysDifference(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function isDateInRange(date, start, end) {
    const checkDate = new Date(date);
    const startDate = new Date(start);
    const endDate = new Date(end);
    return checkDate >= startDate && checkDate <= endDate;
}

// UUID oluşturma
function generateId() {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ==================== NAVIGATION ====================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const pageName = item.dataset.page;
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById(`${pageName}-page`).classList.add('active');

            refreshCurrentPage(pageName);
        });
    });
}

function refreshCurrentPage(pageName) {
    const activePage = pageName || document.querySelector('.nav-item.active').dataset.page;
    if (activePage === 'dashboard') updateDashboard();
    if (activePage === 'personeller') { renderPersonnelPage(); initPersonnelForm(); renderPersonnelTable(); }
    if (activePage === 'izinler') { renderLeavePage(); initLeaveForm(); renderLeaveTable(); }
    if (activePage === 'raporlar') { renderReportsPage(); initReports(); }
}

function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateText = document.getElementById('date-text');
    if (dateText) {
        dateText.textContent = new Date().toLocaleDateString('tr-TR', options);
    }
}

// ==================== DASHBOARD ====================
let currentDistributionView = 'department';

function updateDashboard() {
    const today = getToday();

    // Get today's leaves
    const todayLeaves = leaves.filter(l => isDateInRange(today, l.startDate, l.endDate));
    const onLeaveIds = todayLeaves.map(l => l.personnelId);

    // Calculate stats
    const totalPersonnel = personnel.length;
    const onLeaveCount = onLeaveIds.length;
    const presentCount = totalPersonnel - onLeaveCount;

    // Calculate needed packaging personnel
    // Hedef: 45 kişi (Makine1:6, Makine2:4, Makine3:6, Makine4:6, Makine5:6, Elle:10, Numune:2, Kalite:2, Yedek:3)
    const REQUIRED_PACKAGING = 45;
    const paketlemePersonnel = personnel.filter(p => p.department === 'Paketleme');
    const totalPaketleme = paketlemePersonnel.length;
    const neededPersonnel = Math.max(0, REQUIRED_PACKAGING - totalPaketleme);

    document.getElementById('total-personnel').textContent = totalPersonnel;
    document.getElementById('present-personnel').textContent = presentCount;
    document.getElementById('on-leave-personnel').textContent = onLeaveCount;
    document.getElementById('needed-personnel').textContent = neededPersonnel;

    // Render distribution based on current view
    renderDistribution(currentDistributionView, onLeaveIds);

    // Today's leaves list
    renderTodayLeaves(todayLeaves);

    // Setup toggle buttons
    setupDistributionToggle(onLeaveIds);
}

function setupDistributionToggle(onLeaveIds) {
    const toggleBtns = document.querySelectorAll('.view-toggle .toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDistributionView = btn.dataset.view;
            renderDistribution(currentDistributionView, onLeaveIds);
        });
    });
}

function renderDistribution(view, onLeaveIds) {
    const container = document.getElementById('distribution-container');
    if (!container) return;

    if (view === 'department') {
        renderDepartmentDistribution(container, onLeaveIds);
    } else {
        renderTaskDistribution(container, onLeaveIds);
    }
}

function renderDepartmentDistribution(container, onLeaveIds) {
    const paketleme = personnel.filter(p => p.department === 'Paketleme');
    const balon = personnel.filter(p => p.department === 'Balon Tedarik - Sevkiyat');

    const paketlemeOnLeave = paketleme.filter(p => onLeaveIds.includes(p.id)).length;
    const balonOnLeave = balon.filter(p => onLeaveIds.includes(p.id)).length;

    const paketlemeProgress = paketleme.length > 0 ? ((paketleme.length - paketlemeOnLeave) / paketleme.length) * 100 : 0;
    const balonProgress = balon.length > 0 ? ((balon.length - balonOnLeave) / balon.length) * 100 : 0;

    container.innerHTML = `
        <div class="group-card paketleme" onclick="showGroupPersonnelModal('department', 'Paketleme')">
            <div class="group-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
            </div>
            <div class="group-info">
                <h3>Paketleme</h3>
                <div class="group-stats">
                    <div class="group-stat">
                        <span class="group-stat-value">${paketleme.length}</span>
                        <span class="group-stat-label">Toplam</span>
                    </div>
                    <div class="group-stat">
                        <span class="group-stat-value success">${paketleme.length - paketlemeOnLeave}</span>
                        <span class="group-stat-label">Gelen</span>
                    </div>
                    <div class="group-stat">
                        <span class="group-stat-value danger">${paketlemeOnLeave}</span>
                        <span class="group-stat-label">İzinli</span>
                    </div>
                </div>
            </div>
            <div class="group-progress"><div class="progress-bar" style="width: ${paketlemeProgress}%"></div></div>
        </div>
        <div class="group-card balon" onclick="showGroupPersonnelModal('department', 'Balon Tedarik - Sevkiyat')">
            <div class="group-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="10" r="7"/>
                    <path d="M12 17v4"/>
                    <path d="M8 21h8"/>
                </svg>
            </div>
            <div class="group-info">
                <h3>Balon Tedarik - Sevkiyat</h3>
                <div class="group-stats">
                    <div class="group-stat">
                        <span class="group-stat-value">${balon.length}</span>
                        <span class="group-stat-label">Toplam</span>
                    </div>
                    <div class="group-stat">
                        <span class="group-stat-value success">${balon.length - balonOnLeave}</span>
                        <span class="group-stat-label">Gelen</span>
                    </div>
                    <div class="group-stat">
                        <span class="group-stat-value danger">${balonOnLeave}</span>
                        <span class="group-stat-label">İzinli</span>
                    </div>
                </div>
            </div>
            <div class="group-progress"><div class="progress-bar" style="width: ${balonProgress}%"></div></div>
        </div>
    `;
}

function renderTaskDistribution(container, onLeaveIds) {
    // Get unique tasks with their personnel
    const taskGroups = {};

    tasks.forEach(t => {
        if (!taskGroups[t.task]) {
            taskGroups[t.task] = {
                name: t.task,
                department: t.department,
                personnel: []
            };
        }
    });

    personnel.forEach(p => {
        if (p.task && taskGroups[p.task]) {
            taskGroups[p.task].personnel.push(p);
        }
    });

    const taskArray = Object.values(taskGroups).filter(t => t.personnel.length > 0);

    if (taskArray.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Görev bilgisi bulunamadı</p>
            </div>
        `;
        return;
    }

    container.innerHTML = taskArray.map(task => {
        const total = task.personnel.length;
        const onLeave = task.personnel.filter(p => onLeaveIds.includes(p.id)).length;
        const present = total - onLeave;
        const progress = total > 0 ? (present / total) * 100 : 0;

        return `
            <div class="group-card task-card" onclick="showGroupPersonnelModal('task', '${task.name.replace(/'/g, "\\'")}')">
                <div class="group-icon task-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                </div>
                <div class="group-info">
                    <h3>${task.name}</h3>
                    <div class="group-stats compact">
                        <div class="group-stat">
                            <span class="group-stat-value">${total}</span>
                            <span class="group-stat-label">Toplam</span>
                        </div>
                        <div class="group-stat">
                            <span class="group-stat-value success">${present}</span>
                            <span class="group-stat-label">Gelen</span>
                        </div>
                        <div class="group-stat">
                            <span class="group-stat-value danger">${onLeave}</span>
                            <span class="group-stat-label">İzinli</span>
                        </div>
                    </div>
                </div>
                <div class="group-progress"><div class="progress-bar" style="width: ${progress}%"></div></div>
            </div>
        `;
    }).join('');
}

// Grup personel modalını göster
function showGroupPersonnelModal(type, value) {
    const today = getToday();
    let groupPersonnel = [];
    let title = '';

    if (type === 'department') {
        groupPersonnel = personnel.filter(p => p.department === value);
        title = value;
    } else if (type === 'task') {
        groupPersonnel = personnel.filter(p => p.task === value);
        title = value;
    }

    // Bugün izinli olanları bul
    const onLeaveIds = leaves
        .filter(l => isDateInRange(today, l.startDate, l.endDate))
        .map(l => l.personnelId);

    const presentCount = groupPersonnel.filter(p => !onLeaveIds.includes(p.id)).length;
    const leaveCount = groupPersonnel.filter(p => onLeaveIds.includes(p.id)).length;

    // Modal başlığını güncelle
    document.getElementById('group-modal-title').textContent = title;
    document.getElementById('group-modal-present').textContent = presentCount;
    document.getElementById('group-modal-leave').textContent = leaveCount;

    // Personel listesini oluştur
    const listContainer = document.getElementById('group-personnel-list');

    if (groupPersonnel.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state" style="padding: 40px; text-align: center;">
                <p style="color: var(--text-muted);">Bu grupta personel bulunamadı</p>
            </div>
        `;
    } else {
        // Önce çalışanlar, sonra izinliler
        const sortedPersonnel = [...groupPersonnel].sort((a, b) => {
            const aOnLeave = onLeaveIds.includes(a.id);
            const bOnLeave = onLeaveIds.includes(b.id);
            if (aOnLeave === bOnLeave) return a.name.localeCompare(b.name);
            return aOnLeave ? 1 : -1;
        });

        listContainer.innerHTML = sortedPersonnel.map(p => {
            const isOnLeave = onLeaveIds.includes(p.id);
            const statusClass = isOnLeave ? 'on-leave' : 'present';
            const statusText = isOnLeave ? 'İzinli' : 'Çalışıyor';
            const initials = getInitials(p.name);

            return `
                <div class="personnel-list-item">
                    <div class="personnel-info">
                        <div class="personnel-avatar ${statusClass}">${initials}</div>
                        <div>
                            <div class="personnel-name">${p.name}</div>
                            <div class="personnel-task">${type === 'department' ? (p.task || '-') : (p.department || '-')}</div>
                        </div>
                    </div>
                    <span class="personnel-status ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');
    }

    openModal('group-personnel-modal');
}

// Gerekli personel modalını göster
function showNeededPersonnelModal() {
    const REQUIRED_PACKAGING = 45;

    // Paketleme departmanındaki toplam personel sayısı
    const paketlemePersonnel = personnel.filter(p => p.department === 'Paketleme');
    const totalPaketleme = paketlemePersonnel.length;
    const neededPersonnel = Math.max(0, REQUIRED_PACKAGING - totalPaketleme);

    // Modal değerlerini güncelle
    document.getElementById('needed-current').textContent = totalPaketleme;
    document.getElementById('needed-result').textContent = neededPersonnel;
    document.getElementById('needed-active-text').textContent = totalPaketleme;
    document.getElementById('needed-result-text').textContent = neededPersonnel;

    openModal('needed-personnel-modal');
}

function renderTodayLeaves(todayLeaves) {
    const container = document.getElementById('today-leave-list');
    document.getElementById('leave-count-badge').textContent = `${todayLeaves.length} Kişi`;

    if (todayLeaves.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 16px;">✅</div>
                <p>Bugün izinli personel bulunmuyor</p>
            </div>
        `;
        return;
    }

    container.innerHTML = todayLeaves.map(leave => {
        // Doğum İzni için tarih gösterme
        const isMaternityLeave = leave.type === 'Doğum İzni';
        const dateDisplay = isMaternityLeave ? 'Doğum İzni' : `${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}`;

        return `
            <div class="leave-item leave-item-clickable" data-leave-id="${leave.id}" onclick="showLeaveDetail('${leave.id}')">
                <div class="leave-avatar">${getInitials(leave.personnelName)}</div>
                <div class="leave-info">
                    <div class="leave-name">${leave.personnelName || 'Bilinmiyor'}</div>
                    <div class="leave-details">${leave.department || '-'} • ${dateDisplay}</div>
                </div>
                <span class="leave-type-badge">${leave.type}</span>
            </div>
        `;
    }).join('');
}

// İzin detay modalını göster
function showLeaveDetail(leaveId) {
    const leave = leaves.find(l => l.id === leaveId);
    if (!leave) return;

    // Personel bilgilerini bul (personel notu için)
    const person = personnel.find(p => p.id === leave.personnelId);

    const isMaternityLeave = leave.type === 'Doğum İzni';

    // Modal içeriklerini doldur
    document.getElementById('leave-detail-avatar').textContent = getInitials(leave.personnelName);
    document.getElementById('leave-detail-name').textContent = leave.personnelName || 'Bilinmiyor';

    // Departman yanına personel notu ekle (varsa)
    const deptText = leave.department || '-';
    const personnelNote = person && person.note && person.note.trim() ? person.note : '';
    if (personnelNote) {
        document.getElementById('leave-detail-department').innerHTML = `${deptText} <span class="personnel-note-badge">${personnelNote}</span>`;
    } else {
        document.getElementById('leave-detail-department').textContent = deptText;
    }

    document.getElementById('leave-detail-type').textContent = leave.type;

    // Tarih ve süre bilgileri
    const datesRow = document.getElementById('leave-detail-dates-row');
    const durationRow = document.getElementById('leave-detail-duration-row');

    if (isMaternityLeave) {
        datesRow.style.display = 'none';
        durationRow.style.display = 'none';
    } else {
        datesRow.style.display = 'flex';
        durationRow.style.display = 'flex';
        document.getElementById('leave-detail-dates').textContent = `${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}`;
        const days = getDaysDifference(leave.startDate, leave.endDate);
        document.getElementById('leave-detail-duration').textContent = `${days} Gün`;
    }

    // İzin açıklaması bölümü
    const noteSection = document.getElementById('leave-detail-note-section');
    const noteElement = document.getElementById('leave-detail-note');

    if (leave.note && leave.note.trim()) {
        noteSection.style.display = 'block';
        noteElement.textContent = leave.note;
    } else {
        noteSection.style.display = 'none';
    }

    openModal('leave-detail-modal');
}

// ==================== PERSONNEL MANAGEMENT ====================
function getTasksForDepartment(department) {
    return tasks.filter(t => t.department === department).map(t => t.task);
}

function updateTaskSelect(departmentSelectId, taskSelectId) {
    const department = document.getElementById(departmentSelectId).value;
    const taskSelect = document.getElementById(taskSelectId);
    const tasksForDept = getTasksForDepartment(department);

    taskSelect.innerHTML = '<option value="">Görev seçin</option>' +
        tasksForDept.map(t => `<option value="${t}">${t}</option>`).join('');
}

function updateTaskFilterOptions() {
    const deptFilter = document.getElementById('personnel-filter').value;
    const taskFilterSelect = document.getElementById('personnel-task-filter');

    let tasksToShow = [];
    if (deptFilter) {
        // Sadece seçili departmanın görevlerini göster
        tasksToShow = getTasksForDepartment(deptFilter);
    } else {
        // Tüm görevleri göster
        tasksToShow = tasks.map(t => t.task);
        // Tekrarlananları kaldır
        tasksToShow = [...new Set(tasksToShow)];
    }

    taskFilterSelect.innerHTML = '<option value="">Tüm Görevler</option>' +
        tasksToShow.map(t => `<option value="${t}">${t}</option>`).join('');

    // Task filter değerini sıfırla
    taskFilterSelect.value = '';
}

function initPersonnelForm() {
    const form = document.getElementById('personnel-form');
    const deptSelect = document.getElementById('personnel-department');

    // Populate department select
    deptSelect.innerHTML = '<option value="">Departman seçin</option>' +
        departments.map(d => `<option value="${d}">${d}</option>`).join('');

    // Department change handler
    deptSelect.addEventListener('change', () => updateTaskSelect('personnel-department', 'personnel-task'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');

        // Geçici ID (optimistic UI için) - sunucu gerçek ID'yi döndürecek
        const tempId = 'temp-' + Date.now();
        const data = {
            name: document.getElementById('personnel-name').value,
            department: document.getElementById('personnel-department').value,
            task: document.getElementById('personnel-task').value,
            note: document.getElementById('personnel-note').value,
            createdAt: new Date().toISOString()
        };

        // OPTIMISTIC UI - geçici ID ile göster
        const tempData = { ...data, id: tempId };
        personnel.push(tempData);

        form.reset();
        document.getElementById('personnel-task').innerHTML = '<option value="">Görev seçin</option>';
        renderPersonnelTable();
        updateDashboard();

        showToast('Personel başarıyla eklendi');

        // BACKGROUND SYNC - sunucudan gerçek ID'yi al
        try {
            const result = await apiPost('addPersonnel', data);
            // Geçici ID'yi sunucudan gelen gerçek ID ile değiştir
            const index = personnel.findIndex(p => p.id === tempId);
            if (index !== -1 && result.data && result.data.id) {
                personnel[index].id = result.data.id;
            }
            renderPersonnelTable();
        } catch (error) {
            console.error('Background add error:', error);
            showToast('Ekleme sunucuya iletilemedi!', 'error');
            // Rollback
            personnel = personnel.filter(p => p.id !== tempId);
            renderPersonnelTable();
            updateDashboard();
        }
    });

    // Search and filter
    document.getElementById('personnel-search').addEventListener('input', renderPersonnelTable);

    // Populate department filter dynamically
    const deptFilterSelect = document.getElementById('personnel-filter');
    deptFilterSelect.innerHTML = '<option value="">Tüm Departmanlar</option>' +
        departments.map(d => `<option value="${d}">${d}</option>`).join('');

    deptFilterSelect.addEventListener('change', () => {
        updateTaskFilterOptions();
        renderPersonnelTable();
    });
    document.getElementById('personnel-task-filter').addEventListener('change', renderPersonnelTable);

    // Populate task filter options
    updateTaskFilterOptions();

    // Edit form
    initEditPersonnelForm();
}

function initEditPersonnelForm() {
    const editDeptSelect = document.getElementById('edit-personnel-department');
    editDeptSelect.innerHTML = '<option value="">Departman seçin</option>' +
        departments.map(d => `<option value="${d}">${d}</option>`).join('');

    editDeptSelect.addEventListener('change', () => updateTaskSelect('edit-personnel-department', 'edit-personnel-task'));

    document.getElementById('edit-personnel-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-personnel-id').value;
        const originalPerson = personnel.find(p => p.id === id);

        if (!originalPerson) {
            closeModal('edit-personnel-modal');
            return;
        }

        const name = document.getElementById('edit-personnel-name').value;
        const department = document.getElementById('edit-personnel-department').value;
        const task = document.getElementById('edit-personnel-task').value;
        const note = document.getElementById('edit-personnel-note').value;

        // 1. DIRTY CHECK: Değişiklik var mı?
        // Sadece formdaki alanları kontrol et
        const isUnchanged =
            originalPerson.name === name &&
            originalPerson.department === department &&
            originalPerson.task === task &&
            (originalPerson.note || '') === note;

        if (isUnchanged) {
            closeModal('edit-personnel-modal');
            return;
        }

        const data = {
            id: id,
            name: name,
            department: department,
            task: task,
            note: note,
            phone: originalPerson.phone || '',
            startDate: originalPerson.startDate || ''
        };

        // 2. OPTIMISTIC UI: Beklemeden güncelle
        // UI'ı hemen güncelle
        const index = personnel.findIndex(p => p.id === data.id);
        if (index !== -1) {
            personnel[index] = { ...personnel[index], ...data };
        }

        // Modalı kapat ve tabloyu yenile
        closeModal('edit-personnel-modal');
        renderPersonnelTable();
        updateDashboard();
        showToast('Personel güncellendi');

        // 3. BACKGROUND SYNC: Arkada isteği at
        try {
            await apiPost('updatePersonnel', data);
        } catch (error) {
            console.error('Background sync/update error:', error);
            showToast('Güncelleme sunucuya iletilemedi!', 'error');
            // Rollback
            if (originalPerson && index !== -1) {
                personnel[index] = originalPerson;
                renderPersonnelTable();
            }
        }
    });
}

function renderPersonnelTable() {
    const tbody = document.getElementById('personnel-table-body');
    const search = document.getElementById('personnel-search').value.toLowerCase();
    const filter = document.getElementById('personnel-filter').value;
    const taskFilter = document.getElementById('personnel-task-filter').value;
    const today = getToday();

    let filtered = personnel.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search);
        const matchesFilter = !filter || p.department === filter;
        const matchesTaskFilter = !taskFilter || p.task === taskFilter;
        return matchesSearch && matchesFilter && matchesTaskFilter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">Personel bulunamadı</td></tr>`;
        return;
    }

    // Helper function to convert task name to CSS class
    const getTaskClass = (task) => {
        if (!task) return 'task-default';
        const taskLower = task.toLowerCase();
        if (taskLower === 'sorumlu') return 'task-sorumlu';
        if (taskLower === 'paketleme') return 'task-paketleme';
        if (taskLower.includes('kalite kontrol')) return 'task-kalite-kontrol';
        if (taskLower.includes('numune')) return 'task-numune';
        if (taskLower.includes('reklamlık') || taskLower.includes('reklamlik')) return 'task-tr-reklamlik';
        if (taskLower.includes('paketleme çıkış') || taskLower.includes('paketleme cikis')) return 'task-paketleme-cikis';
        if (taskLower.includes('paketleme tartım') || taskLower.includes('paketleme tartim')) return 'task-paketleme-tartim';
        if (taskLower.includes('stok') && taskLower.includes('sevkiyat')) return 'task-stok-sevkiyat';
        if (taskLower === 'tedarik') return 'task-tedarik';
        if (taskLower.includes('sevkiyat hazırlık') || taskLower.includes('sevkiyat hazirlik')) return 'task-sevkiyat-hazirlik';
        if (taskLower === 'dolum') return 'task-dolum';
        return 'task-default';
    };

    tbody.innerHTML = filtered.map(p => {
        const isOnLeave = leaves.some(l => l.personnelId === p.id && isDateInRange(today, l.startDate, l.endDate));
        const statusClass = isOnLeave ? 'status-leave' : 'status-active';
        const statusText = isOnLeave ? 'İzinli' : 'Aktif';

        // Not ikonu - sadece not varsa göster
        const noteIcon = p.note && p.note.trim() ? `
            <span class="note-indicator" title="${p.note.replace(/"/g, '&quot;')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
            </span>
        ` : '';

        // Get task-specific CSS class
        const taskClass = getTaskClass(p.task);

        return `
            <tr>
                <td><strong>${p.name}</strong>${noteIcon}</td>
                <td>${p.department}</td>
                <td><span class="task-badge ${taskClass}">${p.task || '-'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-icon-only" onclick="editPersonnel('${p.id}')" title="Düzenle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn btn-secondary btn-icon-only btn-danger-hover" onclick="confirmDeletePersonnel('${p.id}')" title="Sil">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function editPersonnel(id) {
    const person = personnel.find(p => p.id === id);
    if (!person) return;

    document.getElementById('edit-personnel-id').value = person.id;
    document.getElementById('edit-personnel-name').value = person.name;
    document.getElementById('edit-personnel-department').value = person.department;
    document.getElementById('edit-personnel-note').value = person.note || '';

    // Update task select and set value
    updateTaskSelect('edit-personnel-department', 'edit-personnel-task');
    setTimeout(() => {
        document.getElementById('edit-personnel-task').value = person.task;
    }, 50);

    openModal('edit-personnel-modal');
}

let deleteCallback = null;

function confirmDeletePersonnel(id) {
    const person = personnel.find(p => p.id === id);
    document.getElementById('delete-modal-text').textContent =
        `"${person?.name || 'Bu personel'}" kaydını silmek istediğinize emin misiniz? İlişkili tüm izin kayıtları da silinecektir.`;

    deleteCallback = async () => {
        showLoading(true);
        try {
            await apiPost('deletePersonnel', null, id);

            // Hızlı güncelleme: Yerel listeden sil
            personnel = personnel.filter(p => p.id !== id);
            // İlişkili izinleri de temizle (frontend için)
            leaves = leaves.filter(l => l.personnelId !== id);

            renderPersonnelTable();
            updateDashboard();
            showToast('Personel silindi', 'warning');
        } catch (error) {
            console.error(error);
        }
        showLoading(false);
        closeModal('delete-modal');
    };

    openModal('delete-modal');
}

// ==================== LEAVE MANAGEMENT ====================
function initLeaveForm() {
    const form = document.getElementById('leave-form');
    const personnelSelect = document.getElementById('leave-personnel');
    const typeSelect = document.getElementById('leave-type');

    // Populate selects
    personnelSelect.innerHTML = '<option value="">Personel seçin</option>' +
        personnel.map(p => `<option value="${p.id}">${p.name} (${p.department})</option>`).join('');

    typeSelect.innerHTML = '<option value="">İzin türü seçin</option>' +
        leaveTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    // Initialize Flatpickr for date inputs
    const flatpickrConfig = {
        locale: 'tr',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd.m.Y',
        disableMobile: true,
        allowInput: false
    };

    flatpickr('#leave-start', {
        ...flatpickrConfig,
        placeholder: 'Tarih seçiniz',
        onChange: function (selectedDates, dateStr, instance) {
            // Set min date for end date picker
            const endPicker = document.getElementById('leave-end')._flatpickr;
            if (endPicker && selectedDates[0]) {
                endPicker.set('minDate', selectedDates[0]);
            }
        }
    });

    // Set placeholder text after Flatpickr init
    const startAltInput = document.querySelector('#leave-start + input');
    if (startAltInput) startAltInput.placeholder = 'Tarih seçiniz';

    flatpickr('#leave-end', flatpickrConfig);

    const endAltInput = document.querySelector('#leave-end + input');
    if (endAltInput) endAltInput.placeholder = 'Tarih seçiniz';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');

        // Geçici ID (optimistic UI için) - sunucu gerçek ID'yi döndürecek
        const tempId = 'temp-' + Date.now();
        const data = {
            personnelId: document.getElementById('leave-personnel').value,
            type: document.getElementById('leave-type').value,
            startDate: document.getElementById('leave-start').value,
            endDate: document.getElementById('leave-end').value,
            note: document.getElementById('leave-note').value,
            createdAt: new Date().toISOString()
        };

        if (new Date(data.endDate) < new Date(data.startDate)) {
            showToast('Bitiş tarihi başlangıç tarihinden önce olamaz', 'error');
            return;
        }

        // OPTIMISTIC UI - geçici ID ile göster
        // frontend update için personel bilgilerini bul
        const person = personnel.find(p => p.id === data.personnelId);

        const optimisticLeave = {
            ...data,
            id: tempId,
            personnelName: person ? person.name : '?',
            department: person ? person.department : '?'
        };

        leaves.push(optimisticLeave);

        form.reset();
        renderLeaveTable();
        updateDashboard();
        showToast('İzin başarıyla eklendi');

        // BACKGROUND SYNC - sunucudan gerçek ID'yi al
        try {
            const result = await apiPost('addLeave', data);
            // Geçici ID'yi sunucudan gelen gerçek ID ile değiştir
            const index = leaves.findIndex(l => l.id === tempId);
            if (index !== -1 && result.data && result.data.id) {
                leaves[index].id = result.data.id;
            }
            renderLeaveTable();
        } catch (error) {
            console.error('Background add error:', error);
            showToast('Ekleme sunucuya iletilemedi!', 'error');
            // Rollback
            leaves = leaves.filter(l => l.id !== tempId);
            renderLeaveTable();
            updateDashboard();
        }
    });

    document.getElementById('leave-filter').addEventListener('change', renderLeaveTable);

    // Edit form
    initEditLeaveForm();
}

function initEditLeaveForm() {
    const editPersonnelSelect = document.getElementById('edit-leave-personnel');
    const editTypeSelect = document.getElementById('edit-leave-type');

    editPersonnelSelect.innerHTML = '<option value="">Personel seçin</option>' +
        personnel.map(p => `<option value="${p.id}">${p.name} (${p.department})</option>`).join('');

    editTypeSelect.innerHTML = '<option value="">İzin türü seçin</option>' +
        leaveTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    // Initialize Flatpickr for edit form date inputs
    const flatpickrConfig = {
        locale: 'tr',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd.m.Y',
        disableMobile: true,
        allowInput: false
    };

    flatpickr('#edit-leave-start', {
        ...flatpickrConfig,
        onChange: function (selectedDates) {
            const endPicker = document.getElementById('edit-leave-end')._flatpickr;
            if (endPicker && selectedDates[0]) {
                endPicker.set('minDate', selectedDates[0]);
            }
        }
    });

    // Set placeholder text after Flatpickr init
    const editStartAltInput = document.querySelector('#edit-leave-start + input');
    if (editStartAltInput) editStartAltInput.placeholder = 'Tarih seçiniz';

    flatpickr('#edit-leave-end', flatpickrConfig);

    const editEndAltInput = document.querySelector('#edit-leave-end + input');
    if (editEndAltInput) editEndAltInput.placeholder = 'Tarih seçiniz';

    document.getElementById('edit-leave-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');

        const data = {
            id: document.getElementById('edit-leave-id').value,
            personnelId: document.getElementById('edit-leave-personnel').value,
            type: document.getElementById('edit-leave-type').value,
            startDate: document.getElementById('edit-leave-start').value,
            endDate: document.getElementById('edit-leave-end').value,
            note: document.getElementById('edit-leave-note').value
        };

        // Tarih kontrolü
        if (new Date(data.endDate) < new Date(data.startDate)) {
            showToast('Bitiş tarihi başlangıç tarihinden önce olamaz', 'error');
            return;
        }

        // 1. DIRTY CHECK
        const originalLeave = leaves.find(l => l.id === data.id);
        if (originalLeave) {
            const isUnchanged =
                originalLeave.personnelId === data.personnelId &&
                originalLeave.type === data.type &&
                originalLeave.startDate === data.startDate &&
                originalLeave.endDate === data.endDate &&
                (originalLeave.note || '') === (data.note || '');

            if (isUnchanged) {
                closeModal('edit-leave-modal');
                return;
            }
        }

        // 2. OPTIMISTIC UI
        const index = leaves.findIndex(l => l.id === data.id);
        // frontend update için personel bilgilerini bulmamız lazım
        const person = personnel.find(p => p.id === data.personnelId);

        // Orijinal kopyayı sakla (rollback için)
        const backupLeave = { ...leaves[index] };

        if (index !== -1) {
            leaves[index] = {
                ...leaves[index],
                ...data,
                personnelName: person ? person.name : leaves[index].personnelName,
                department: person ? person.department : leaves[index].department
            };
        }

        closeModal('edit-leave-modal');
        renderLeaveTable();
        updateDashboard();
        showToast('İzin güncellendi');

        // 3. BACKGROUND SYNC
        try {
            await apiPost('updateLeave', data);
        } catch (error) {
            console.error('Background update error:', error);
            showToast('Güncelleme başarısız!', 'error');
            // Rollback
            if (index !== -1) {
                leaves[index] = backupLeave;
                renderLeaveTable();
            }
        }
    });
}

function renderLeaveTable() {
    const tbody = document.getElementById('leave-table-body');
    const filter = document.getElementById('leave-filter').value;
    const today = getToday();

    let filtered = leaves.filter(l => {
        if (filter === 'active') return isDateInRange(today, l.startDate, l.endDate);
        if (filter === 'past') return new Date(l.endDate) < new Date(today);
        if (filter === 'future') return new Date(l.startDate) > new Date(today);
        return true;
    });

    filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">İzin kaydı bulunamadı</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(l => {
        const days = getDaysDifference(l.startDate, l.endDate);
        const isActive = isDateInRange(today, l.startDate, l.endDate);
        const isPast = new Date(l.endDate) < new Date(today);

        // Doğum İzni için tarih ve gün gösterme
        const isMaternityLeave = l.type === 'Doğum İzni';
        const startDateDisplay = isMaternityLeave ? '-' : formatDate(l.startDate);
        const endDateDisplay = isMaternityLeave ? '-' : formatDate(l.endDate);
        const daysDisplay = isMaternityLeave ? '-' : `<strong>${days}</strong> gün`;

        let statusClass = 'status-leave';
        let statusText = 'Beklemede';
        if (isActive) { statusClass = 'status-active'; statusText = 'Aktif'; }
        else if (isPast) { statusClass = 'status-inactive'; statusText = 'Tamamlandı'; }

        return `
            <tr>
                <td><strong>${l.personnelName || 'Bilinmiyor'}</strong></td>
                <td>${l.department || '-'}</td>
                <td>${l.type}</td>
                <td>${startDateDisplay}</td>
                <td>${endDateDisplay}</td>
                <td>${daysDisplay}</td>
                <td>${l.note || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-icon-only" onclick="editLeave('${l.id}')" title="Düzenle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn btn-secondary btn-icon-only btn-danger-hover" onclick="confirmDeleteLeave('${l.id}')" title="Sil">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function editLeave(id) {
    const leave = leaves.find(l => l.id === id);
    if (!leave) return;

    document.getElementById('edit-leave-id').value = leave.id;
    document.getElementById('edit-leave-personnel').value = leave.personnelId;
    document.getElementById('edit-leave-type').value = leave.type;
    document.getElementById('edit-leave-start').value = leave.startDate;
    document.getElementById('edit-leave-end').value = leave.endDate;
    document.getElementById('edit-leave-note').value = leave.note || '';

    openModal('edit-leave-modal');
}

function confirmDeleteLeave(id) {
    const leave = leaves.find(l => l.id === id);
    document.getElementById('delete-modal-text').textContent =
        `"${leave?.personnelName || 'Bu'}" kişisinin izin kaydını silmek istediğinize emin misiniz?`;

    deleteCallback = async () => {
        showLoading(true);
        try {
            await apiPost('deleteLeave', null, id);

            // Hızlı güncelleme: Yerel listeden sil
            leaves = leaves.filter(l => l.id !== id);

            renderLeaveTable();
            updateDashboard();
            showToast('İzin silindi', 'warning');
        } catch (error) {
            console.error(error);
        }
        showLoading(false);
        closeModal('delete-modal');
    };

    openModal('delete-modal');
}

// Delete confirmation
document.getElementById('confirm-delete').addEventListener('click', () => {
    if (deleteCallback) deleteCallback();
});

// ==================== REPORTS ====================
function initReports() {
    const personnelSelect = document.getElementById('report-personnel');
    const typeSelect = document.getElementById('report-type');

    personnelSelect.innerHTML = '<option value="">Tüm Personeller</option>' +
        personnel.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    typeSelect.innerHTML = '<option value="">Tüm Türler</option>' +
        leaveTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    document.getElementById('generate-report').addEventListener('click', generateReport);
}

function generateReport() {
    const personnelId = document.getElementById('report-personnel').value;
    const year = document.getElementById('report-year').value;
    const type = document.getElementById('report-type').value;

    let filtered = leaves.filter(l => {
        const leaveYear = new Date(l.startDate).getFullYear().toString();
        const matchesPersonnel = !personnelId || l.personnelId === personnelId;
        const matchesYear = leaveYear === year;
        const matchesType = !type || l.type === type;
        return matchesPersonnel && matchesYear && matchesType;
    });

    filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    // Show summary
    const summaryEl = document.getElementById('report-summary');
    summaryEl.style.display = 'grid';

    const totalDays = filtered.reduce((sum, l) => sum + getDaysDifference(l.startDate, l.endDate), 0);
    const totalCount = filtered.length;

    document.getElementById('total-leave-days').textContent = totalDays;
    document.getElementById('total-leave-count').textContent = totalCount;


    // Render table
    const tbody = document.getElementById('report-table-body');

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">Kayıt bulunamadı</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(l => {
        const days = getDaysDifference(l.startDate, l.endDate);

        // Doğum İzni için tarih ve gün gösterme
        const isMaternityLeave = l.type === 'Doğum İzni';
        const startDateDisplay = isMaternityLeave ? '-' : formatDate(l.startDate);
        const endDateDisplay = isMaternityLeave ? '-' : formatDate(l.endDate);
        const daysDisplay = isMaternityLeave ? '-' : `<strong>${days}</strong> gün`;

        return `
            <tr>
                <td><strong>${l.personnelName || 'Bilinmiyor'}</strong></td>
                <td>${l.department || '-'}</td>
                <td>${l.type}</td>
                <td>${startDateDisplay}</td>
                <td>${endDateDisplay}</td>
                <td>${daysDisplay}</td>
                <td>${l.note || '-'}</td>
            </tr>
        `;
    }).join('');
}

// ==================== RENDER PAGE CONTENT ====================
function renderDashboardPage() {
    document.getElementById('dashboard-page').innerHTML = `
        <div class="page-header">
            <h1>Dashboard</h1>
            <p class="page-subtitle">Günlük personel durumu ve grup dağılımları</p>
        </div>
        <div class="stats-grid">
            <div class="stat-card stat-total">
                <div class="stat-icon">👥</div>
                <div class="stat-content">
                    <span class="stat-value" id="total-personnel">0</span>
                    <span class="stat-label">Toplam Personel</span>
                </div>
            </div>
            <div class="stat-card stat-present">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                    <span class="stat-value" id="present-personnel">0</span>
                    <span class="stat-label">Aktif Çalışan Personel</span>
                </div>
            </div>
            <div class="stat-card stat-leave">
                <div class="stat-icon">📅</div>
                <div class="stat-content">
                    <span class="stat-value" id="on-leave-personnel">0</span>
                    <span class="stat-label">İzinli Personel</span>
                </div>
            </div>
            <div class="stat-card stat-needed" onclick="showNeededPersonnelModal()">
                <div class="stat-icon">🔔</div>
                <div class="stat-content">
                    <span class="stat-value" id="needed-personnel">0</span>
                    <span class="stat-label">Gerekli Paketleme Personeli</span>
                </div>
            </div>
        </div>
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <div class="card-header">
                    <h2>Grup Dağılımları</h2>
                    <div class="view-toggle">
                        <button class="toggle-btn active" data-view="department">Departman</button>
                        <button class="toggle-btn" data-view="task">Görev</button>
                    </div>
                </div>
                <div class="card-content">
                    <div id="distribution-container" class="group-cards">
                        <!-- Dinamik olarak doldurulacak -->
                    </div>
                </div>
            </div>
            <div class="dashboard-card">
                <div class="card-header">
                    <h2>Bugün İzinli Personeller</h2>
                    <span class="card-badge warning" id="leave-count-badge">0 Kişi</span>
                </div>
                <div class="card-content">
                    <div class="leave-list" id="today-leave-list"></div>
                </div>
            </div>
        </div>
    `;
}

function renderPersonnelPage() {
    document.getElementById('personeller-page').innerHTML = `
        <div class="page-header">
            <h1>Personel Yönetimi</h1>
            <p class="page-subtitle">Personel ekleme, düzenleme ve silme işlemleri</p>
        </div>
        <div class="content-grid">
            <div class="form-card">
                <div class="card-header"><h2>Yeni Personel Ekle</h2></div>
                <form id="personnel-form" class="form">
                    <div class="form-group">
                        <label for="personnel-name">Ad Soyad</label>
                        <input type="text" id="personnel-name" placeholder="Personel adı ve soyadı" required>
                    </div>
                    <div class="form-group">
                        <label for="personnel-department">Departman</label>
                        <select id="personnel-department" required></select>
                    </div>
                    <div class="form-group">
                        <label for="personnel-task">Görev</label>
                        <select id="personnel-task" required><option value="">Önce departman seçin</option></select>
                    </div>
                    <div class="form-group">
                        <label for="personnel-note">Not <span class="optional-label">(Opsiyonel)</span></label>
                        <textarea id="personnel-note" placeholder="Denemede, veri girişi vb. açıklama..." rows="2"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        <span>Personel Ekle</span>
                    </button>
                </form>
            </div>
            <div class="table-card">
                <div class="card-header">
                    <h2>Personel Listesi</h2>
                    <div class="table-actions">
                        <div class="search-box">
                            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input type="text" id="personnel-search" placeholder="Personel ara...">
                        </div>
                        <select id="personnel-filter" class="filter-select">
                            <option value="">Tüm Departmanlar</option>
                        </select>
                        <select id="personnel-task-filter" class="filter-select">
                            <option value="">Tüm Görevler</option>
                        </select>
                    </div>
                </div>
                <div class="table-container">
                    <table><thead><tr>
                        <th>Ad Soyad</th><th>Departman</th><th>Görev</th><th>İşlemler</th>
                    </tr></thead><tbody id="personnel-table-body"></tbody></table>
                </div>
            </div>
        </div>
    `;
}

function renderLeavePage() {
    document.getElementById('izinler-page').innerHTML = `
        <div class="page-header">
            <h1>İzin Yönetimi</h1>
            <p class="page-subtitle">Personel izin ekleme, düzenleme ve takip işlemleri</p>
        </div>
        <div class="content-grid">
            <div class="form-card">
                <div class="card-header"><h2>Yeni İzin Ekle</h2></div>
                <form id="leave-form" class="form">
                    <div class="form-group">
                        <label for="leave-personnel">Personel</label>
                        <select id="leave-personnel" required></select>
                    </div>
                    <div class="form-group">
                        <label for="leave-type">İzin Türü</label>
                        <select id="leave-type" required></select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="leave-start">Başlangıç Tarihi</label>
                            <input type="date" id="leave-start" required>
                        </div>
                        <div class="form-group">
                            <label for="leave-end">Bitiş Tarihi</label>
                            <input type="date" id="leave-end" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="leave-note">Açıklama</label>
                        <textarea id="leave-note" placeholder="İzin açıklaması..." rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        <span>İzin Ekle</span>
                    </button>
                </form>
            </div>
            <div class="table-card">
                <div class="card-header">
                    <h2>İzin Listesi</h2>
                    <div class="table-actions">
                        <select id="leave-filter" class="filter-select">
                            <option value="">Tüm İzinler</option>
                            <option value="active">Aktif İzinler</option>
                            <option value="past">Geçmiş İzinler</option>
                            <option value="future">Gelecek İzinler</option>
                        </select>
                    </div>
                </div>
                <div class="table-container">
                    <table><thead><tr>
                        <th>Personel</th><th>Departman</th><th>İzin Türü</th><th>Başlangıç</th><th>Bitiş</th><th>Gün</th><th>Açıklama</th><th>İşlemler</th>
                    </tr></thead><tbody id="leave-table-body"></tbody></table>
                </div>
            </div>
        </div>
    `;
}

function renderReportsPage() {
    document.getElementById('raporlar-page').innerHTML = `
        <div class="page-header">
            <h1>Devamsızlık Raporları</h1>
            <p class="page-subtitle">Personel bazlı devamsızlık analizi</p>
        </div>
        <div class="report-container">
            <div class="report-filters">
                <div class="filter-group">
                    <label for="report-personnel">Personel Seçin</label>
                    <select id="report-personnel"></select>
                </div>
                <div class="filter-group">
                    <label for="report-year">Yıl</label>
                    <select id="report-year">
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="report-type">İzin Türü</label>
                    <select id="report-type"></select>
                </div>
                <button id="generate-report" class="btn btn-primary">📊 Rapor Oluştur</button>
            </div>
            <div class="report-summary" id="report-summary" style="display: none;">
                <div class="summary-card">
                    <div class="summary-icon blue">📅</div>
                    <div class="summary-content">
                        <span class="summary-value" id="total-leave-days">0</span>
                        <span class="summary-label">Toplam İzin Günü</span>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon green">📋</div>
                    <div class="summary-content">
                        <span class="summary-value" id="total-leave-count">0</span>
                        <span class="summary-label">Toplam İzin Sayısı</span>
                    </div>
                </div>
            </div>
            <div class="report-table-card">
                <div class="card-header"><h2>Devamsızlık Detayları</h2></div>
                <div class="table-container">
                    <table><thead><tr>
                        <th>Personel</th><th>Departman</th><th>İzin Türü</th><th>Başlangıç</th><th>Bitiş</th><th>Gün Sayısı</th><th>Açıklama</th>
                    </tr></thead><tbody id="report-table-body"></tbody></table>
                </div>
            </div>
        </div>
    `;
}

// ==================== INIT ====================
async function init() {
    // Render all pages
    renderDashboardPage();
    renderPersonnelPage();
    renderLeavePage();
    renderReportsPage();

    // Initialize components
    updateCurrentDate();
    initNavigation();
    initThemeToggle();

    // Load data from Google Sheets
    await loadAllData();

    // Initialize forms and tables
    initPersonnelForm();
    initLeaveForm();
    initReports();

    // Initial data display
    updateDashboard();
    renderPersonnelTable();
    renderLeaveTable();
}

// ==================== LOGIN SYSTEM ====================
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        return true;
    }
    return false;
}

function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function showAppContainer() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    // Update user info in navbar
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');

    if (currentUser && userNameEl && userAvatarEl) {
        userNameEl.textContent = currentUser.name;
        userAvatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const rememberMe = document.getElementById('remember-me');

    if (!loginForm) return;

    // Kaydedilmiş bilgileri yükle
    const savedCredentials = localStorage.getItem('savedCredentials');
    if (savedCredentials) {
        const credentials = JSON.parse(savedCredentials);
        emailInput.value = credentials.email || '';
        passwordInput.value = credentials.password || '';
        if (rememberMe) rememberMe.checked = true;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        // Clear previous error
        loginError.textContent = '';

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span> Giriş yapılıyor...';

        try {
            const result = await apiCall('login', { email, password });

            if (result.success && result.data) {
                currentUser = result.data;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                // "Beni Hatırla" seçiliyse bilgileri kaydet
                if (rememberMe && rememberMe.checked) {
                    localStorage.setItem('savedCredentials', JSON.stringify({ email, password }));
                } else {
                    localStorage.removeItem('savedCredentials');
                }

                showToast(`Hoş geldiniz, ${currentUser.name}!`, 'success');
                showAppContainer();

                // Load app data
                await init();
            } else {
                loginError.textContent = result.error || 'Giriş başarısız';
            }
        } catch (error) {
            loginError.textContent = 'Giriş yapılamadı. Lütfen tekrar deneyin.';
        }

        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Giriş Yap</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
    });
}

function initUserMenu() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenu = document.querySelector('.user-menu');

    if (!userMenuBtn || !userMenu) return;

    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) {
            userMenu.classList.remove('open');
        }
    });
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showToast('Çıkış yapıldı', 'success');
    showLoginPage();

    // Clear form
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
}

// ==================== START APPLICATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Initialize login form
    initLoginForm();
    initUserMenu();

    // Check if user is already logged in
    if (checkLoginStatus()) {
        showAppContainer();
        await init();
    } else {
        showLoginPage();
        // Hide loading overlay
        document.getElementById('loading-overlay').classList.add('hidden');
    }
});
