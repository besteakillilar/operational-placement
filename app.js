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
let showArchivedPersonnel = false;

// ==================== API FUNCTIONS ====================
async function apiCall(action, data = null) {
    try {
        let url = `${API_URL}?action=${action}`;
        if (data) {
            url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('API URL Hatası (404). Lütfen yeni deployment yapın ve URL güncelleyin.');
            }
            throw new Error(`HTTP Hatası: ${response.status}`);
        }

        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error('API Yanıt Hatası: "Who has access" ayarını "Anyone" yapınız.');
        }

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

        const response = await fetch(url, {
            method: 'POST',
            redirect: 'follow'
        });
        if (!response.ok) {
            throw new Error(`HTTP Hatası: ${response.status}`);
        }

        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error('API Yanıt Hatası: "Who has access" ayarını "Anyone" yapınız.');
        }

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

// Helper function to get CSS class for task badges
function getTaskClass(task) {
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
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ==================== SEARCHABLE DROPDOWN ====================
function initSearchablePersonnelDropdown(selectId, personnelList) {
    const originalSelect = document.getElementById(selectId);
    if (!originalSelect) return;

    // Eğer zaten wrapper varsa, sadece listeyi güncelle
    const existingWrapper = originalSelect.closest('.searchable-dropdown-wrapper');
    if (existingWrapper) {
        updateSearchableDropdownOptions(selectId, personnelList);
        return;
    }

    // Wrapper oluştur
    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-dropdown-wrapper';
    wrapper.setAttribute('data-select-id', selectId);

    // Arama input'u oluştur
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'searchable-dropdown-input';
    searchInput.placeholder = 'Personel ara veya seç...';
    searchInput.autocomplete = 'off';

    // Dropdown listesi oluştur
    const dropdownList = document.createElement('div');
    dropdownList.className = 'searchable-dropdown-list';

    // Original select'i gizle ama form için tut
    originalSelect.style.display = 'none';

    // Wrapper'ı DOM'a ekle
    originalSelect.parentNode.insertBefore(wrapper, originalSelect);
    wrapper.appendChild(searchInput);
    wrapper.appendChild(dropdownList);
    wrapper.appendChild(originalSelect);

    // Listeyi doldur
    updateSearchableDropdownOptions(selectId, personnelList);

    // Event listeners
    searchInput.addEventListener('focus', () => {
        dropdownList.classList.add('active');
        filterDropdownOptions(selectId, searchInput.value);
    });

    searchInput.addEventListener('input', () => {
        filterDropdownOptions(selectId, searchInput.value);
    });

    // Dışarı tıklayınca kapat
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdownList.classList.remove('active');
        }
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        const items = dropdownList.querySelectorAll('.searchable-dropdown-item:not(.hidden)');
        const activeItem = dropdownList.querySelector('.searchable-dropdown-item.highlighted');
        let currentIndex = Array.from(items).indexOf(activeItem);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentIndex < items.length - 1) {
                items.forEach(i => i.classList.remove('highlighted'));
                items[currentIndex + 1].classList.add('highlighted');
                items[currentIndex + 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
                items.forEach(i => i.classList.remove('highlighted'));
                items[currentIndex - 1].classList.add('highlighted');
                items[currentIndex - 1].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeItem) {
                activeItem.click();
            }
        } else if (e.key === 'Escape') {
            dropdownList.classList.remove('active');
            searchInput.blur();
        }
    });
}

function updateSearchableDropdownOptions(selectId, personnelList) {
    const wrapper = document.querySelector(`.searchable-dropdown-wrapper[data-select-id="${selectId}"]`);
    if (!wrapper) return;

    const dropdownList = wrapper.querySelector('.searchable-dropdown-list');
    const originalSelect = document.getElementById(selectId);

    // Select'i temizle ve yeniden doldur
    originalSelect.innerHTML = '<option value="">Personel seçin</option>';
    dropdownList.innerHTML = '';

    personnelList.forEach(p => {
        // Original select'e ekle
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} (${p.department})`;
        originalSelect.appendChild(option);

        // Dropdown listesine ekle
        const item = document.createElement('div');
        item.className = 'searchable-dropdown-item';
        item.setAttribute('data-value', p.id);
        item.innerHTML = `
            <span class="dropdown-item-name">${p.name}</span>
            <span class="dropdown-item-dept">${p.department}</span>
        `;

        item.addEventListener('click', () => {
            selectDropdownItem(selectId, p.id, p.name, p.department);
        });

        dropdownList.appendChild(item);
    });
}

function filterDropdownOptions(selectId, searchTerm) {
    const wrapper = document.querySelector(`.searchable-dropdown-wrapper[data-select-id="${selectId}"]`);
    if (!wrapper) return;

    const dropdownList = wrapper.querySelector('.searchable-dropdown-list');
    const items = dropdownList.querySelectorAll('.searchable-dropdown-item');
    const search = searchTerm.toLowerCase().trim();

    let firstVisible = null;
    items.forEach(item => {
        const name = item.querySelector('.dropdown-item-name').textContent.toLowerCase();
        const dept = item.querySelector('.dropdown-item-dept').textContent.toLowerCase();

        if (name.includes(search) || dept.includes(search)) {
            item.classList.remove('hidden');
            if (!firstVisible) firstVisible = item;
        } else {
            item.classList.add('hidden');
        }
        item.classList.remove('highlighted');
    });

    // İlk görünen öğeyi highlight et
    if (firstVisible) {
        firstVisible.classList.add('highlighted');
    }
}

function selectDropdownItem(selectId, value, name, department) {
    const wrapper = document.querySelector(`.searchable-dropdown-wrapper[data-select-id="${selectId}"]`);
    if (!wrapper) return;

    const searchInput = wrapper.querySelector('.searchable-dropdown-input');
    const dropdownList = wrapper.querySelector('.searchable-dropdown-list');
    const originalSelect = document.getElementById(selectId);

    // Input'u güncelle
    searchInput.value = `${name} (${department})`;

    // Original select'i güncelle
    originalSelect.value = value;

    // Dropdown'u kapat
    dropdownList.classList.remove('active');
}

function setSearchableDropdownValue(selectId, value) {
    const wrapper = document.querySelector(`.searchable-dropdown-wrapper[data-select-id="${selectId}"]`);
    const originalSelect = document.getElementById(selectId);

    if (!originalSelect) return;

    // Değeri bul
    const person = personnel.find(p => p.id === value);

    if (wrapper) {
        const searchInput = wrapper.querySelector('.searchable-dropdown-input');
        if (person) {
            searchInput.value = `${person.name} (${person.department})`;
        } else {
            searchInput.value = '';
        }
    }

    originalSelect.value = value;
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

// ==================== NEEDED PERSONNEL HELPERS ====================
const defaultTargets = {
    'Paketleme': {
        'Makine 1': 6, 'Makine 2': 4, 'Makine 3': 6, 'Makine 4': 6, 'Makine 5': 6,
        'Elle Paketleme': 10, 'Numune': 2, 'Kalite Kontrol': 2, 'Yedek': 3
    },
    'Balon': {
        'Stok': 2, 'Sevkiyat': 3, 'Tedarik': 2, 'Dolum': 2, 'Hazırlık': 2
    }
};

function getTargetSettings() {
    const stored = localStorage.getItem('targetSettings');
    return stored ? JSON.parse(stored) : defaultTargets;
}

function saveTargetSettings(settings) {
    localStorage.setItem('targetSettings', JSON.stringify(settings));
}

function calculateNeeded(dept) {
    const settings = getTargetSettings();
    const targets = settings[dept] || {};
    const totalTarget = Object.values(targets).reduce((sum, val) => sum + (parseInt(val) || 0), 0);

    const activePersonnel = personnel.filter(p => !p.archived);
    const deptPersonnel = activePersonnel.filter(p => {
        if (dept === 'Paketleme') return p.department === 'Paketleme';
        if (dept === 'Balon') return p.department && p.department.includes('Balon');
        return false;
    });

    const totalCurrent = deptPersonnel.length;
    return Math.max(0, totalTarget - totalCurrent);
}

function updateDashboard() {
    const today = getToday();

    // Get today's leaves
    const todayLeaves = leaves.filter(l => isDateInRange(today, l.startDate, l.endDate));
    const onLeaveIds = todayLeaves.map(l => l.personnelId);

    // Calculate stats
    const totalPersonnel = personnel.length;
    const onLeaveCount = onLeaveIds.length;
    const presentCount = totalPersonnel - onLeaveCount;

    // Calculate needed personnel using dynamic targets
    const neededPaketleme = calculateNeeded('Paketleme');
    const neededBalon = calculateNeeded('Balon');

    document.getElementById('total-personnel').textContent = totalPersonnel;
    document.getElementById('present-personnel').textContent = presentCount;
    document.getElementById('on-leave-personnel').textContent = onLeaveCount;

    const neededEl = document.getElementById('needed-personnel');
    if (neededEl) neededEl.textContent = neededPaketleme;

    const neededBalonEl = document.getElementById('needed-balon');
    if (neededBalonEl) neededBalonEl.textContent = neededBalon;

    // Render distribution
    renderDistribution(currentDistributionView, onLeaveIds);
    renderTodayLeaves(todayLeaves);
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
            <div class="view-icon-corner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            </div>
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
            <div class="view-icon-corner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            </div>
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
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
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
function showNeededPersonnelModal(dept) {
    const settings = getTargetSettings();
    let targets = settings[dept] || {};

    const totalTarget = Object.values(targets).reduce((sum, val) => sum + (parseInt(val) || 0), 0);

    // Calculate current active
    const activePersonnel = personnel.filter(p => !p.archived);
    const deptPersonnel = activePersonnel.filter(p => {
        if (dept === 'Paketleme') return p.department === 'Paketleme';
        if (dept === 'Balon') return p.department && p.department.includes('Balon');
        return false;
    });
    const totalCurrent = deptPersonnel.length;
    const needed = Math.max(0, totalTarget - totalCurrent);

    // Update Modal
    const modalTitle = dept === 'Paketleme' ? '📦 Gerekli Paketleme Personeli' : '🎈 Gerekli Balon Tedarik Personeli';
    const modalHeader = document.querySelector('#needed-personnel-modal h3');
    if (modalHeader) modalHeader.textContent = modalTitle;

    document.getElementById('needed-current').textContent = totalCurrent;
    document.getElementById('needed-result').textContent = needed;

    const targetValEl = document.querySelector('.needed-stat.target .needed-value');
    if (targetValEl) targetValEl.textContent = totalTarget;

    document.getElementById('needed-active-text').textContent = totalCurrent;
    document.getElementById('needed-result-text').textContent = needed;

    // Editable Breakdown
    const breakdownContainer = document.querySelector('.needed-breakdown');
    breakdownContainer.innerHTML = `<h4>📊 İhtiyaç Dağılımı (<span id="breakdown-header-total">${totalTarget}</span> Kişi)</h4><div class="breakdown-grid" id="breakdown-grid"></div>`;

    const grid = document.getElementById('breakdown-grid');

    for (const [key, value] of Object.entries(targets)) {
        const row = document.createElement('div');
        row.className = 'breakdown-row';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';

        row.innerHTML = `
            <span>${key}</span>
            <input type="number" class="target-input" data-key="${key}" value="${value}" min="0" 
            style="width: 70px; padding: 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); text-align: center;">
        `;
        grid.appendChild(row);
    }

    // Add Save Button if not exists
    const modalActions = document.querySelector('#needed-personnel-modal .modal-actions');
    modalActions.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('needed-personnel-modal')">İptal</button>
        <button class="btn btn-primary" id="save-needed-btn">Kaydet</button>
    `;

    // Event Listeners
    const inputs = grid.querySelectorAll('.target-input');

    // Live calc
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            let newTotal = 0;
            inputs.forEach(i => newTotal += (parseInt(i.value) || 0));

            // Update UI
            if (document.getElementById('breakdown-header-total'))
                document.getElementById('breakdown-header-total').textContent = newTotal;
            if (targetValEl) targetValEl.textContent = newTotal;

            const newNeeded = Math.max(0, newTotal - totalCurrent);
            document.getElementById('needed-result').textContent = newNeeded;
            document.getElementById('needed-result-text').textContent = newNeeded;
        });
    });

    document.getElementById('save-needed-btn').onclick = () => {
        const newTargets = {};
        inputs.forEach(i => {
            newTargets[i.dataset.key] = parseInt(i.value) || 0;
        });

        const currentSettings = getTargetSettings();
        currentSettings[dept] = newTargets;
        saveTargetSettings(currentSettings);

        updateDashboard();
        closeModal('needed-personnel-modal');
        showToast('Hedefler ve ihtiyaçlar güncellendi');
    };

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
                <div class="leave-actions">
                    <span class="leave-type-badge">${leave.type}</span>
                    <div class="view-icon-inline">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </div>
                </div>
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

    // Initialize page filters - bu her zaman çalışmalı
    initPersonnelPageFilters();

    // Event listener'ların tekrar eklenmesini engelle (sadece modal form için)
    if (form.dataset.initialized) {
        return;
    }
    form.dataset.initialized = 'true';

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

        // Frontend validasyon
        if (!data.name || !data.name.trim()) {
            showToast('Lütfen personel adı girin', 'error');
            return;
        }

        // API'ye gönderilecek data'nın bir kopyasını oluştur (form.reset() sonrası data bozulmaması için)
        const apiData = {
            name: data.name.trim(),
            department: data.department,
            task: data.task,
            note: data.note
        };

        // OPTIMISTIC UI - geçici ID ile göster
        const tempData = { ...data, id: tempId };
        personnel.push(tempData);

        form.reset();
        document.getElementById('personnel-task').innerHTML = '<option value="">Görev seçin</option>';
        closeModal('add-personnel-modal');
        renderPersonnelTable();
        updateDashboard();

        showToast('Personel başarıyla eklendi');

        // BACKGROUND SYNC - sunucudan gerçek ID'yi al
        console.log('API\'ye gönderilen personel verisi:', apiData);

        try {
            const result = await apiPost('addPersonnel', apiData);
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

    // Edit form
    initEditPersonnelForm();
}

// Sayfa filtreleri için ayrı init fonksiyonu - her render'da çağrılır
function initPersonnelPageFilters() {
    const searchInput = document.getElementById('personnel-search');
    const deptFilterSelect = document.getElementById('personnel-filter');
    const taskFilterSelect = document.getElementById('personnel-task-filter');

    if (!deptFilterSelect || !taskFilterSelect) return;

    // Populate department filter
    deptFilterSelect.innerHTML = '<option value="">Tüm Departmanlar</option>' +
        departments.map(d => `<option value="${d}">${d}</option>`).join('');

    // Populate task filter
    updateTaskFilterOptions();

    // Event listeners - her seferinde yeniden ekle (elementler yeniden oluşturulduğu için)
    if (searchInput) {
        searchInput.oninput = renderPersonnelTable;
    }

    deptFilterSelect.onchange = () => {
        updateTaskFilterOptions();
        renderPersonnelTable();
    };

    taskFilterSelect.onchange = renderPersonnelTable;

    // Arşiv toggle butonunun görünümünü güncelle
    updateArchiveToggleButton();
}

// Arşiv görünümünü toggle et
function toggleArchivedView() {
    showArchivedPersonnel = !showArchivedPersonnel;
    updateArchiveToggleButton();

    // Bilgilendirme ve Debug
    const archivedCount = personnel.filter(p => p.archived).length;
    console.log('Arşiv Toggle:', showArchivedPersonnel, 'Toplam Arşivli:', archivedCount);



    renderPersonnelTable();
}

// Arşiv toggle butonunun görünümünü güncelle
function updateArchiveToggleButton() {
    const btn = document.getElementById('show-archived-toggle');
    if (!btn) return;

    if (showArchivedPersonnel) {
        btn.classList.add('active');
        btn.innerHTML = '📦 Arşivi Gizle';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '📦 Arşivi Göster';
    }
}

// ==================== CLEAR FILTER FUNCTIONS ====================
function clearPersonnelFilters() {
    document.getElementById('personnel-search').value = '';
    document.getElementById('personnel-filter').value = '';
    document.getElementById('personnel-task-filter').value = '';
    showArchivedPersonnel = false;
    updateArchiveToggleButton();
    updateTaskFilterOptions();
    renderPersonnelTable();
    showToast('Filtreler temizlendi', 'success');
}

function clearLeaveFilters() {
    document.getElementById('leave-filter').value = '';
    renderLeaveTable();
    showToast('Filtreler temizlendi', 'success');
}

function clearReportFilters() {
    document.getElementById('report-personnel').value = '';
    document.getElementById('report-year').value = new Date().getFullYear().toString();
    document.getElementById('report-type').value = '';
    // Hide summary and clear table
    document.getElementById('report-summary').style.display = 'none';
    document.getElementById('report-table-body').innerHTML = '';
    showToast('Filtreler temizlendi', 'success');
}

// ==================== ADD PERSONNEL MODAL ====================
function openAddPersonnelModal() {
    // Reset form
    const form = document.getElementById('personnel-form');
    if (form) form.reset();

    // Reset task select
    const taskSelect = document.getElementById('personnel-task');
    if (taskSelect) {
        taskSelect.innerHTML = '<option value="">Önce departman seçin</option>';
    }

    // Populate department select
    const deptSelect = document.getElementById('personnel-department');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">Departman seçin</option>' +
            departments.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    openModal('add-personnel-modal');
}

// ==================== PERSONNEL STATS UPDATE ====================
function updatePersonnelStats() {
    const today = getToday();

    // Calculate fixed stats - these don't change with filters
    // Arşivlenmiş personelleri istatistiklere dahil etmeyelim
    const activePersonnel = personnel.filter(p => !p.archived);

    const totalCount = activePersonnel.length;
    const paketlemeCount = activePersonnel.filter(p => p.department === 'Paketleme').length;
    const balonCount = activePersonnel.filter(p => p.department && p.department.includes('Balon')).length;

    const onLeaveIds = leaves
        .filter(l => isDateInRange(today, l.startDate, l.endDate))
        .map(l => l.personnelId);
    const leaveCount = personnel.filter(p => onLeaveIds.includes(p.id)).length;

    // Update stat cards
    const totalEl = document.getElementById('personnel-stat-total');
    const paketlemeEl = document.getElementById('personnel-stat-paketleme');
    const balonEl = document.getElementById('personnel-stat-balon');
    const leaveEl = document.getElementById('personnel-stat-leave');

    if (totalEl) totalEl.textContent = totalCount;
    if (paketlemeEl) paketlemeEl.textContent = paketlemeCount;
    if (balonEl) balonEl.textContent = balonCount;
    if (leaveEl) leaveEl.textContent = leaveCount;
}

// ==================== PERSONNEL LIST MODAL ====================
function showPersonnelListModal(category, title) {
    const today = getToday();
    // Base list: sadece aktif personeller
    const activePersonnel = personnel.filter(p => !p.archived);
    let filteredPersonnel = [];

    if (category === 'all') {
        filteredPersonnel = activePersonnel;
    } else if (category === 'leave') {
        const onLeaveIds = leaves
            .filter(l => isDateInRange(today, l.startDate, l.endDate))
            .map(l => l.personnelId);
        filteredPersonnel = activePersonnel.filter(p => onLeaveIds.includes(p.id));
    } else if (category.startsWith('leave-dept-')) {
        // Filter active leaves first, then department
        const deptKeyword = category.replace('leave-dept-', '');
        const onLeaveIds = leaves
            .filter(l => isDateInRange(today, l.startDate, l.endDate))
            .map(l => l.personnelId);

        filteredPersonnel = activePersonnel.filter(p => {
            if (!onLeaveIds.includes(p.id)) return false;
            if (deptKeyword === 'Paketleme') return p.department === 'Paketleme';
            if (deptKeyword === 'Balon') return p.department && p.department.includes('Balon');
            return false;
        });
    } else if (category === 'leave-absent') {
        // Filter 'Mazeretsiz Gelmedi'
        const absentIds = leaves
            .filter(l => isDateInRange(today, l.startDate, l.endDate) && l.type === 'Mazeretsiz Gelmedi')
            .map(l => l.personnelId);
        filteredPersonnel = activePersonnel.filter(p => absentIds.includes(p.id));
    } else {
        // Department filter
        filteredPersonnel = activePersonnel.filter(p => p.department === category || (p.department && p.department.includes(category)));
    }

    // Build modal content
    let listHtml = '';
    if (filteredPersonnel.length === 0) {
        listHtml = '<p class="no-data-text">Bu kategoride personel bulunmuyor.</p>';
    } else {
        listHtml = '<div class="personnel-modal-list">';
        filteredPersonnel.forEach(p => {
            const activeLeave = leaves.find(l => l.personnelId === p.id && isDateInRange(today, l.startDate, l.endDate));
            const isOnLeave = !!activeLeave;
            const taskClass = getTaskClass(p.task);

            let leaveBadge = '';
            if (isOnLeave) {
                const days = getDaysDifference(activeLeave.startDate, activeLeave.endDate);
                const isMaternity = activeLeave.type === 'Doğum İzni';
                const leaveText = isMaternity ? 'Doğum İzni' : `${activeLeave.type} (${days} gün)`;
                leaveBadge = `<span class="leave-badge-mini" title="${formatDate(activeLeave.startDate)} - ${formatDate(activeLeave.endDate)}">${leaveText}</span>`;
            }

            listHtml += `
                <div class="personnel-modal-item ${isOnLeave ? 'on-leave' : ''}">
                    <div class="personnel-modal-name">${p.name}</div>
                    <div class="personnel-modal-info">
                        <span class="task-badge ${taskClass}">${p.task || '-'}</span>
                        ${leaveBadge}
                    </div>
                </div>
            `;
        });
        listHtml += '</div>';
    }

    // Update modal content and show
    document.getElementById('personnel-list-modal-title').textContent = title;
    document.getElementById('personnel-list-modal-count').textContent = `${filteredPersonnel.length} kişi`;
    document.getElementById('personnel-list-modal-body').innerHTML = listHtml;
    openModal('personnel-list-modal');
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

        // Arşiv filtresi: 
        // Toggle AÇIK (showArchivedPersonnel = true) -> Sadece Arşivliler
        // Toggle KAPALI (showArchivedPersonnel = false) -> Sadece Aktifler
        const matchesArchive = showArchivedPersonnel ? p.archived : !p.archived;

        return matchesSearch && matchesFilter && matchesTaskFilter && matchesArchive;
    });

    console.log('Tablo Render:', { total: personnel.length, filtered: filtered.length, showArchived: showArchivedPersonnel });

    // Update stats cards (fixed values, don't change with filters)
    updatePersonnelStats();

    if (filtered.length === 0) {
        let message = 'Personel bulunamadı';
        // Arşiv modu açıkken farklı mesaj göster
        if (showArchivedPersonnel) {
            message = '📦 Arşivde personel bulunmamaktadır.';
            // Eğer ekstra filtreler varsa mesajı güncelle
            if (search || filter || taskFilter) {
                message = '📦 Arşivde kriterlere uygun personel bulunamadı.';
            }
        } else if (search || filter || taskFilter) {
            message = 'Kriterlere uygun personel bulunamadı.';
        }

        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">${message}</td></tr>`;
        return;
    }

    // Arşivlenmişleri sona at
    filtered.sort((a, b) => {
        if (a.archived && !b.archived) return 1;
        if (!a.archived && b.archived) return -1;
        return a.name.localeCompare(b.name);
    });

    tbody.innerHTML = filtered.map(p => {
        const isOnLeave = leaves.some(l => l.personnelId === p.id && isDateInRange(today, l.startDate, l.endDate));
        const statusClass = isOnLeave ? 'status-leave' : 'status-active';
        const statusText = isOnLeave ? 'İzinli' : 'Aktif';
        const isArchived = p.archived === true;

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

        // Arşiv badge'i
        const archiveBadge = isArchived ? '<span class="archive-badge">📦 Arşiv</span>' : '';

        // Get task-specific CSS class
        const taskClass = getTaskClass(p.task);

        // Row class - arşivlenmişse soluk görünüm
        const rowClass = isArchived ? 'archived-row' : '';

        // Arşivle veya Geri Al butonu
        const archiveButton = isArchived ? `
            <button class="btn btn-secondary btn-icon-only btn-restore" onclick="restorePersonnel('${p.id}')" title="Arşivden Çıkar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
            </button>
        ` : `
            <button class="btn btn-secondary btn-icon-only btn-archive" onclick="archivePersonnel('${p.id}')" title="Arşivle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8"/>
                    <rect x="1" y="3" width="22" height="5"/>
                    <line x1="10" y1="12" x2="14" y2="12"/>
                </svg>
            </button>
        `;

        return `
            <tr class="${rowClass}">
                <td><strong>${p.name}</strong>${noteIcon}${archiveBadge}</td>
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
                        ${archiveButton}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (showArchivedPersonnel) {
        const hasArchived = filtered.some(p => p.archived);
        if (!hasArchived) {
            // Mevcut içeriğin altına ekle
            const emptyMessage = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted); font-style: italic; background: var(--bg-input);">
                        📦 Arşivlenmiş personel bulunmamaktadır.
                    </td>
                </tr>
            `;
            // Eğer tablo zaten boş değilse altına ekle, yoksa (hiç kayıt yoksa) sadece bunu göster
            if (filtered.length > 0) {
                tbody.innerHTML += emptyMessage;
            } else {
                // filtered.length === 0 durumu en başta handle edilmişti ama
                // eğer arşiv toggle açıkken hiç kayıt yoksa "Personel bulunamadı" yerine bunu göstermek isteyebiliriz
                // veya filtreleme sonucu 0 ise ve arşiv açıksa...
                // Şu anki kodun üst kısmında if (filtered.length === 0) return var.
                // O yüzden buraya kod hiç gelmeyebilir eğer tüm liste boşsa.
                // Bunu düzeltmek gerekebilir ama şimdilik mevcut listenin altına ekleyelim.
            }
        }
    }
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

// ==================== ARCHIVE PERSONNEL ====================
async function archivePersonnel(id) {
    const person = personnel.find(p => p.id === id);
    if (!person) return;

    // Optimistic UI
    person.archived = true;
    renderPersonnelTable();
    updateDashboard();
    showToast(`${person.name} arşivlendi`, 'warning');

    // API sync
    try {
        await apiPost('archivePersonnel', null, id);
    } catch (error) {
        console.error('Archive error:', error);
        showToast('Arşivleme başarısız!', 'error');
        // Rollback
        person.archived = false;
        renderPersonnelTable();
    }
}

async function restorePersonnel(id) {
    const person = personnel.find(p => p.id === id);
    if (!person) return;

    // Optimistic UI
    person.archived = false;
    renderPersonnelTable();
    updateDashboard();
    showToast(`${person.name} arşivden çıkarıldı`, 'success');

    // API sync
    try {
        await apiPost('restorePersonnel', null, id);
    } catch (error) {
        console.error('Restore error:', error);
        showToast('Geri alma başarısız!', 'error');
        // Rollback
        person.archived = true;
        renderPersonnelTable();
    }
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

    // Populate selects - sadece sunucuyla senkronize olan personelleri göster
    // temp- ile başlayan ID'ler henüz sunucuya eklenmemiş, bunları filtrele
    const syncedPersonnel = personnel.filter(p => !String(p.id).startsWith('temp-'));

    // Searchable dropdown için personel listesini hazırla
    initSearchablePersonnelDropdown('leave-personnel', syncedPersonnel);

    typeSelect.innerHTML = '<option value="">İzin türü seçin</option>' +
        leaveTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    // Event listener'ların tekrar eklenmesini engelle
    if (form.dataset.initialized) {
        return;
    }
    form.dataset.initialized = 'true';

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

        // Personel seçimi validasyonu
        if (!data.personnelId) {
            showToast('Lütfen bir personel seçin', 'error');
            return;
        }

        // Henüz sunucuya senkronize olmamış personel seçilmiş mi kontrol et
        if (String(data.personnelId).startsWith('temp-')) {
            showToast('Bu personel henüz kaydedilmedi, lütfen birkaç saniye bekleyip tekrar deneyin', 'error');
            return;
        }

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
        // Searchable dropdown input'unu da temizle
        const searchInput = document.querySelector('.searchable-dropdown-wrapper[data-select-id="leave-personnel"] .searchable-dropdown-input');
        if (searchInput) searchInput.value = '';

        closeModal('add-leave-modal');
        if (typeof updateLeaveStats === 'function') updateLeaveStats();
        renderLeaveTable();
        updateDashboard();
        showToast('İzin başarıyla eklendi');

        // BACKGROUND SYNC - sunucudan gerçek ID'yi al
        // API'ye gönderilecek data'nın bir kopyasını oluştur (form.reset() sonrası data bozulmaması için)
        const apiData = {
            personnelId: data.personnelId,
            type: data.type,
            startDate: data.startDate,
            endDate: data.endDate,
            note: data.note
        };

        console.log('API\'ye gönderilen izin verisi:', apiData);

        try {
            const result = await apiPost('addLeave', apiData);
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

    // temp- ile başlayan ID'ler henüz sunucuya eklenmemiş, bunları filtrele
    const syncedPersonnel = personnel.filter(p => !String(p.id).startsWith('temp-'));

    // Searchable dropdown için personel listesini hazırla
    initSearchablePersonnelDropdown('edit-leave-personnel', syncedPersonnel);

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

    // Searchable dropdown değerini set et
    setSearchableDropdownValue('edit-leave-personnel', leave.personnelId);

    document.getElementById('edit-leave-type').value = leave.type;
    document.getElementById('edit-leave-note').value = leave.note || '';

    // Flatpickr instance'larına tarihleri set et
    const startInput = document.getElementById('edit-leave-start');
    const endInput = document.getElementById('edit-leave-end');

    if (startInput._flatpickr && leave.startDate) {
        startInput._flatpickr.setDate(leave.startDate, true);
    } else {
        startInput.value = leave.startDate;
    }

    if (endInput._flatpickr && leave.endDate) {
        endInput._flatpickr.setDate(leave.endDate, true);
    } else {
        endInput.value = leave.endDate;
    }

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
// ==================== REPORTS ====================
function initReports() {
    const monthSelect = document.getElementById('report-month');
    const typeSelect = document.getElementById('report-type');

    if (!document.getElementById('report-personnel-container') || !typeSelect) return;

    // Personnel Dropdown - uses utils/searchableDropdown logic explicitly or reuses function
    // Assuming createSearchableDropdown exists and works.
    createSearchableDropdown('report-personnel-container', 'report-personnel',
        [{ id: '', name: 'Tüm Personeller' }, ...personnel.filter(p => !p.archived)],
        'Tüm Personeller'
    );

    // Populate Months
    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    if (monthSelect) {
        monthSelect.innerHTML = '<option value="">Tümü</option>' +
            months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    }

    typeSelect.innerHTML = '<option value="">Tüm Türler</option>' +
        leaveTypes.map(t => `<option value="${t}">${t}</option>`).join('');

    document.getElementById('generate-report').addEventListener('click', generateReport);
}

function generateReport() {
    const personnelId = document.getElementById('report-personnel').value;
    const month = document.getElementById('report-month').value;
    const type = document.getElementById('report-type').value;

    let filtered = leaves.filter(l => {
        const leaveDate = new Date(l.startDate);
        const leaveMonth = (leaveDate.getMonth() + 1).toString();
        const leaveYear = leaveDate.getFullYear();
        const currentYear = new Date().getFullYear();

        // Match selection
        const matchesPersonnel = !personnelId || l.personnelId === personnelId;
        // Match month logic: if month selected, match month AND must be current year (to make sense) or just ignore year?
        // User said "replace year with month". Assuming standard reporting for "this year's month".
        const matchesMonth = !month || (leaveMonth === month && leaveYear === currentYear);
        // If no month selected, show all history or just this year? Default to "All time" if "All" selected, else specific month of current year.

        const matchesType = !type || l.type === type;
        return matchesPersonnel && matchesMonth && matchesType;
    });

    filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    // Show summary
    const summaryEl = document.getElementById('report-summary');
    const summaryDaysCard = document.getElementById('summary-card-days');
    const summaryCountCard = document.getElementById('summary-card-count');

    summaryEl.style.display = 'grid';

    // Conditional Display Logic
    if (personnelId) {
        // Specific personnel selected -> Show BOTH
        summaryDaysCard.style.display = 'flex';
        summaryCountCard.style.display = 'flex';
    } else {
        // No personnel (All) -> Show ONLY Total Count
        summaryDaysCard.style.display = 'none';
        summaryCountCard.style.display = 'flex';
    }

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

// ==================== UTILS: SEARCHABLE DROPDOWN ====================
function createSearchableDropdown(containerId, inputId, items, defaultText = 'Seçiniz') {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(inputId);
    if (!container || !hiddenInput) return;

    // Reset container content
    container.innerHTML = `
        <div class="dropdown-trigger" tabindex="0">
            <span class="dropdown-text">${defaultText}</span>
            <svg width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M6 8.5L1.5 4h9L6 8.5z"/></svg>
        </div>
        <div class="dropdown-menu-custom">
            <div class="dropdown-search-box">
                <input type="text" placeholder="Ara..." class="dropdown-search-input">
            </div>
            <div class="dropdown-options"></div>
        </div>
    `;

    const trigger = container.querySelector('.dropdown-trigger');
    const menu = container.querySelector('.dropdown-menu-custom');
    const searchInput = container.querySelector('.dropdown-search-input');
    const optionsContainer = container.querySelector('.dropdown-options');
    const textData = container.querySelector('.dropdown-text');

    // Populate Options
    function renderOptions(filter = '') {
        optionsContainer.innerHTML = '';

        // Default Option (Clear)
        const defaultOption = document.createElement('div');
        defaultOption.className = 'dropdown-option';
        defaultOption.textContent = defaultText;
        defaultOption.dataset.value = '';
        defaultOption.onclick = () => selectOption('', defaultText);
        optionsContainer.appendChild(defaultOption);

        const filteredItems = items.filter(item => item.name.toLowerCase().includes(filter.toLowerCase()));

        if (filteredItems.length === 0) {
            const noRes = document.createElement('div');
            noRes.className = 'dropdown-no-results';
            noRes.textContent = 'Sonuç bulunamadı';
            optionsContainer.appendChild(noRes);
        } else {
            filteredItems.forEach(item => {
                const option = document.createElement('div');
                option.className = 'dropdown-option';
                option.textContent = item.name;
                option.dataset.value = item.id;
                option.onclick = () => selectOption(item.id, item.name);
                optionsContainer.appendChild(option);
            });
        }
    }

    function selectOption(value, text) {
        hiddenInput.value = value;
        textData.textContent = text;
        menu.classList.remove('active');
        trigger.classList.remove('active');
    }

    // Interactions
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = menu.classList.contains('active');
        // Close others
        document.querySelectorAll('.dropdown-menu-custom').forEach(m => m.classList.remove('active'));
        document.querySelectorAll('.dropdown-trigger').forEach(t => t.classList.remove('active'));

        if (!isActive) {
            menu.classList.add('active');
            trigger.classList.add('active');
            searchInput.value = '';
            renderOptions();
            searchInput.focus();
        }
    });

    searchInput.addEventListener('click', e => e.stopPropagation());
    searchInput.addEventListener('input', (e) => renderOptions(e.target.value));

    // Close on outside click is handled globally or we add here
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            menu.classList.remove('active');
            trigger.classList.remove('active');
        }
    });
}

// ==================== RENDER PAGE CONTENT ====================
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
            <div class="stat-card stat-needed" onclick="showNeededPersonnelModal('Paketleme')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </div>
                <div class="stat-icon">🔔</div>
                <div class="stat-content">
                    <span class="stat-value" id="needed-personnel">0</span>
                    <span class="stat-label">Gerekli Paketleme Personeli</span>
                </div>
            </div>
            <div class="stat-card stat-needed" onclick="showNeededPersonnelModal('Balon')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </div>
                <div class="stat-icon">🎈</div>
                <div class="stat-content">
                    <span class="stat-value" id="needed-balon">0</span>
                    <span class="stat-label">Gerekli Balon Tedarik Personeli</span>
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

// ==================== RENDER PAGE CONTENT ====================
function renderPersonnelPage() {
    document.getElementById('personeller-page').innerHTML = `
        <div class="page-header" style="max-width: 1200px; margin: 0 auto 24px auto; display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
            <div>
                <h1 style="margin-bottom: 6px;">Personel Yönetimi</h1>
                <p class="page-subtitle" style="margin-bottom: 0;">Personel ekleme, düzenleme ve silme işlemleri</p>
            </div>
            <button class="btn btn-primary" onclick="openAddPersonnelModal()" style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>Yeni Personel Ekle</span>
            </button>
        </div>
        
        <!-- Department Summary Stats Cards (Dashboard Style) -->
        <div class="personnel-stats-grid" id="personnel-stats-grid">
            <div class="stat-card stat-total" style="position: relative;" onclick="showPersonnelListModal('all', 'Tüm Personeller')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
                <div class="stat-icon">👥</div>
                <div class="stat-content">
                    <span class="stat-value" id="personnel-stat-total">0</span>
                    <span class="stat-label">Toplam</span>
                </div>
            </div>
            <div class="stat-card stat-paketleme" style="position: relative;" onclick="showPersonnelListModal('Paketleme', 'Paketleme Personeli')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
                <div class="stat-icon">📦</div>
                <div class="stat-content">
                    <span class="stat-value" id="personnel-stat-paketleme">0</span>
                    <span class="stat-label">Paketleme</span>
                </div>
            </div>
            <div class="stat-card stat-balon" style="position: relative;" onclick="showPersonnelListModal('Balon Tedarik', 'Balon Tedarik Personeli')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
                <div class="stat-icon">🎈</div>
                <div class="stat-content">
                    <span class="stat-value" id="personnel-stat-balon">0</span>
                    <span class="stat-label">Balon Tedarik</span>
                </div>
            </div>
            <div class="stat-card stat-leave" style="position: relative;" onclick="showPersonnelListModal('leave', 'İzinli Personeller')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
                <div class="stat-icon">📅</div>
                <div class="stat-content">
                    <span class="stat-value" id="personnel-stat-leave">0</span>
                    <span class="stat-label">İzinli</span>
                </div>
            </div>
        </div>

        <div class="personnel-list-container">
            <div class="table-card table-card-centered">
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
                        <button type="button" class="btn btn-secondary btn-archive-toggle" id="show-archived-toggle" onclick="toggleArchivedView()" title="Arşivlenmiş personelleri göster/gizle">
                            📦 Arşivi Göster
                        </button>
                        <button type="button" class="btn btn-secondary btn-clear-filter" onclick="clearPersonnelFilters()" title="Filtreleri Temizle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            <span>Temizle</span>
                        </button>
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

// ==================== LEAVE PAGE LOGIC ====================

function updateLeaveStats() {
    const today = getToday();
    const activeLeaves = leaves.filter(l => isDateInRange(today, l.startDate, l.endDate));
    const activeLeavePersonnelIds = activeLeaves.map(l => l.personnelId);

    // Total Active Leaves
    const totalCount = activeLeaves.length;

    // Filter by department
    const paketlemeCount = activeLeaves.filter(l => {
        const p = personnel.find(per => per.id === l.personnelId);
        return p && p.department === 'Paketleme';
    }).length;


    const balonCount = activeLeaves.filter(l => {
        const p = personnel.find(per => per.id === l.personnelId);
        return p && (p.department && p.department.includes('Balon'));
    }).length;

    // Update numbers if elements exist
    const totalEl = document.getElementById('leave-stat-total');
    if (totalEl) totalEl.textContent = totalCount;

    const paketlemeEl = document.getElementById('leave-stat-paketleme');
    if (paketlemeEl) paketlemeEl.textContent = paketlemeCount;

    const balonEl = document.getElementById('leave-stat-balon');
    if (balonEl) balonEl.textContent = balonCount;
}

function openAddLeaveModal() {
    // Reset form
    const form = document.getElementById('leave-form');
    if (form) form.reset();

    // Populate personnel select - sadece sunucuyla senkronize olan personelleri göster
    // Populate personnel select - sadece sunucuyla senkronize olan ve arşivlenmemiş personelleri göster
    const select = document.getElementById('leave-personnel');
    if (select) {
        // temp- ile başlayan ID'ler henüz sunucuya eklenmemiş, bunları filtrele
        // Arşivlenmiş personelleri filtrele
        const syncedPersonnel = personnel.filter(p => !String(p.id).startsWith('temp-') && !p.archived);

        // Searchable Dropdown'ı güncelle
        if (typeof updateSearchableDropdownOptions === 'function') {
            updateSearchableDropdownOptions('leave-personnel', syncedPersonnel);
        } else {
            // Fallback: normal select
            select.innerHTML = '<option value="">Personel Seçin</option>' +
                syncedPersonnel.map(p => `<option value="${p.id}">${p.name} (${p.department})</option>`).join('');
        }
    }

    // Populate leave type select
    const typeSelect = document.getElementById('leave-type');
    if (typeSelect && typeof leaveTypes !== 'undefined') {
        typeSelect.innerHTML = '<option value="">İzin Türü Seçin</option>' +
            leaveTypes.map(t => `<option value="${t}">${t}</option>`).join('');
    }

    openModal('add-leave-modal');
}

function renderLeavePage() {
    // Render the page structure matches Personnel Page layout
    document.getElementById('izinler-page').innerHTML = `
        <div class="page-header" style="max-width: 1200px; margin: 0 auto 24px auto; display: flex; justify-content: space-between; align-items: center; padding: 0 2px;">
            <div>
                <h1 style="margin-bottom: 6px;">İzin Yönetimi</h1>
                <p class="page-subtitle" style="margin-bottom: 0;">Personel izin takip ve yönetimi</p>
            </div>
            <button class="btn btn-primary" onclick="openAddLeaveModal()" style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>Yeni İzin Ekle</span>
            </button>
        </div>

        <!-- Leave Stats Cards (Updated with Emojis to match Personel Page) -->
        <div class="personnel-stats-grid leave-stats-grid" style="margin: 0 auto 24px auto;">
            <!-- Total Leave -->
            <div class="stat-card stat-total" style="position: relative; cursor: pointer;" onclick="showPersonnelListModal('leave', 'Şu An İzinli Personeller')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </div>
                <div class="stat-icon">👥</div>
                <div class="stat-content">
                    <span class="stat-value" id="leave-stat-total">0</span>
                    <span class="stat-label">Toplam İzinli</span>
                </div>
            </div>

            <!-- Paketleme Leave -->
            <div class="stat-card stat-paketleme" style="position: relative; cursor: pointer;" onclick="showPersonnelListModal('leave-dept-Paketleme', 'Paketleme İzinli Personel')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </div>
                <div class="stat-icon">📦</div>
                <div class="stat-content">
                    <span class="stat-value" id="leave-stat-paketleme">0</span>
                    <span class="stat-label">Paketleme İzinli</span>
                </div>
            </div>

            <!-- Balon Leave -->
            <div class="stat-card stat-balon" style="position: relative; cursor: pointer;" onclick="showPersonnelListModal('leave-dept-Balon', 'Balon Tedarik İzinli Personel')">
                <div class="view-icon-corner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </div>
                <div class="stat-icon">🎈</div>
                <div class="stat-content">
                    <span class="stat-value" id="leave-stat-balon">0</span>
                    <span class="stat-label">Balon Tedarik İzinli</span>
                </div>
            </div>
        </div>

        <div class="personnel-list-container" style="margin: 0 auto;">
            <div class="table-card table-card-centered">
                <div class="card-header">
                    <h2>İzin Listesi</h2>
                    <div class="table-actions">
                        <select id="leave-filter" class="filter-select">
                            <option value="">Tüm İzinler</option>
                            <option value="active">Aktif İzinler</option>
                            <option value="past">Geçmiş İzinler</option>
                            <option value="future">Gelecek İzinler</option>
                        </select>
                        <button type="button" class="btn btn-secondary btn-clear-filter" onclick="clearLeaveFilters()" title="Filtreleri Temizle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            <span>Temizle</span>
                        </button>
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

    updateLeaveStats();
    renderLeaveTable();
}

// ==================== REPORT RENDER ====================
function renderReportsPage() {
    document.getElementById('raporlar-page').innerHTML = `
        <div class="page-header">
            <h1>Devamsızlık Raporları</h1>
            <p class="page-subtitle">Personel bazlı devamsızlık analizi</p>
        </div>
            <div class="report-container">
                <div class="report-filters">
                    <div class="filter-group" style="flex: 2; min-width: 250px;">
                        <label>Personel Seçin</label>
                        <div id="report-personnel-container" class="custom-dropdown-wrapper">
                            <!-- JS injects content here -->
                        </div>
                        <input type="hidden" id="report-personnel" value="">
                    </div>
                    <div class="filter-group">
                        <label for="report-month">Ay</label>
                        <select id="report-month">
                            <option value="">Tümü</option>
                            <!-- Populated via JS -->
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="report-type">İzin Türü</label>
                        <select id="report-type"></select>
                    </div>
                    <button id="generate-report" class="btn btn-primary">📊 Rapor Oluştur</button>
                    <button type="button" class="btn btn-secondary btn-clear-filter" onclick="clearReportFilters()" title="Filtreleri Temizle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>Temizle</span>
                    </button>
                </div>
                <div class="report-summary" id="report-summary" style="display: none;">
                    <div class="summary-card" id="summary-card-days">
                        <div class="summary-icon blue">📅</div>
                        <div class="summary-content">
                            <span class="summary-value" id="total-leave-days">0</span>
                            <span class="summary-label">Toplam İzin Günü</span>
                        </div>
                    </div>
                    <div class="summary-card" id="summary-card-count">
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

    // Force Dashboard Active on Load
    const dashboardNav = document.querySelector('.nav-item[data-page="dashboard"]');
    if (dashboardNav) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        dashboardNav.classList.add('active');

        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage) dashboardPage.classList.add('active');
    }
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

                showToast(`Hoş geldiniz, ${currentUser.name} !`, 'success');
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
