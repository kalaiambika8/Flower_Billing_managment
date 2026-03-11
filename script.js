// State Management
const defaultState = {
    members: [], // { id: timestamp, name: string }
    entries: {}, // { "YYYY-MM-DD": { memberId: quantity } }
    dailyRates: {}, // { "YYYY-MM-DD": rate }
    users: [], // { username, password, name }
    currentUser: null, // { username, name }
    settings: {
        rate: 0, // Default rate
        commissionEnabled: false,
        commissionType: 'percent', // Default to percent
        commissionAmount: 10, // Default 10%
        luggageEnabled: false,
        luggageAmount: 0,
        shopName: '',
        logo: null,
        banner: null
    },
    theme: 'light',
    auditLogs: []
};

let state = loadData();

// --- Data Persistence ---

function loadData() {
    const saved = localStorage.getItem('billApp_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Migration for new fields
        if (!parsed.dailyRates) parsed.dailyRates = {};
        if (!parsed.users) parsed.users = [];
        // Ensure currentUser is valid or null
        if (parsed.currentUser === undefined) parsed.currentUser = null;

        if (!parsed.settings.commissionType) {
            parsed.settings.commissionType = 'percent';
            if (parsed.settings.commissionAmount === 0) parsed.settings.commissionAmount = 10;
        }
        if (!parsed.theme) parsed.theme = 'light';
        // Migration for logo/banner
        if (parsed.settings.logo === undefined) parsed.settings.logo = null;
        if (parsed.settings.banner === undefined) parsed.settings.banner = null;
        if (parsed.settings.shopName === undefined) parsed.settings.shopName = '';

        if (!parsed.auditLogs) parsed.auditLogs = [];
        parsed.members.forEach(m => {
            if (m.advance === undefined) m.advance = 0;
        });

        // Apply theme
        if (parsed.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        return parsed;
    }
    return defaultState;
}

function saveData(render = true) {
    localStorage.setItem('billApp_data', JSON.stringify(state));
    if (render) renderCurrentView();
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    if (state.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    saveData(false); // No need to re-render entire view, CSS handles it
}

function resetData() {
    const input = prompt("WARNING: This will delete ALL data permanently.\nTo confirm, please type 'CONFIRM' below:");
    if (input === "CONFIRM") {
        state = JSON.parse(JSON.stringify(defaultState));
        saveData();
        location.reload();
    }
}

// --- Audit & Sync Utilities ---

function logActivity(action, details) {
    if (!state.auditLogs) state.auditLogs = [];
    state.auditLogs.unshift({
        time: new Date().toISOString(),
        user: state.currentUser ? state.currentUser.username : 'System',
        action,
        details
    });
    if (state.auditLogs.length > 200) state.auditLogs.pop();
    // Intentionally not calling saveData() here to avoid recursive renders, callers will save.
}

window.addEventListener('online', () => {
    showToast('Internet restored. Syncing entries to backend...', 'info');
    setTimeout(() => {
        showToast('Sync Complete! All daily entries backed up.', 'success');
        logActivity('System', 'Offline-First Sync Complete to Backend');
        saveData(false);
    }, 2000);
});

window.addEventListener('offline', () => {
    showToast('You are offline. Entries are saved locally and will sync when reconnected.', 'warning');
});

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 text-white px-4 py-3 rounded-xl shadow-lg z-50 animate-slide-in flex gap-2 items-center`;
    toast.style.backgroundColor = type === 'success' ? '#34C759' : type === 'warning' ? '#f59e0b' : '#007AFF';
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : type === 'warning' ? 'wifi-off' : 'info'}" class="h-5 w-5"></i><span>${msg}</span>`;
    document.body.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- Search Logistics ---

function toggleMobileSearch() {
    const container = document.getElementById('mobile-search-container');
    container.classList.toggle('hidden');
    if (!container.classList.contains('hidden')) {
        document.getElementById('mobile-global-search-input').focus();
    }
}

function handleGlobalSearch(query) {
    const val = query.trim().toLowerCase();
    const overlay = document.getElementById('search-results-overlay');
    const container = document.getElementById('search-results-container');

    // Sync both inputs
    document.getElementById('global-search-input').value = query;
    document.getElementById('mobile-global-search-input').value = query;

    if (val.length < 2) {
        closeGlobalSearch();
        return;
    }

    const matches = state.members.filter(m =>
        m.name.toLowerCase().includes(val) ||
        (m.mobile && m.mobile.includes(val)) ||
        m.id.toString().includes(val)
    ).slice(0, 10); // cap at 10

    if (matches.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 text-sm">No members found.</div>`;
    } else {
        container.innerHTML = `
            <div class="p-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Members</div>
            <ul class="divide-y divide-gray-100 dark:divide-gray-700">
                ${matches.map(m => `
                    <li class="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center transition-colors" onclick="searchGoToMember(${m.id})">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                ${getInitials(m.name)}
                            </div>
                            <div>
                                <div class="font-medium text-gray-900 dark:text-white text-sm">${m.name}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">ID: ${m.id} ${m.mobile ? `· ${m.mobile}` : ''}</div>
                            </div>
                        </div>
                        <i data-lucide="chevron-right" class="h-4 w-4 text-gray-400"></i>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    overlay.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeGlobalSearch() {
    document.getElementById('search-results-overlay').classList.add('hidden');
}

function searchGoToMember(id) {
    closeGlobalSearch();
    document.getElementById('global-search-input').value = '';
    document.getElementById('mobile-global-search-input').value = '';
    document.getElementById('mobile-search-container').classList.add('hidden');

    // Switch to members tab and immediately edit
    switchTab('members');
    openEditMemberModal(id);
}

// --- Auth Logic ---

// Helper: Hash Password (SHA-256)
async function hashPassword(plainText) {
    const msgBuffer = new TextEncoder().encode(plainText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkAuth() {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (state.currentUser) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        renderCurrentView();
    } else {
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        renderAuthView('signin');
    }
}

function renderAuthView(mode) {
    const container = document.getElementById('auth-container');

    const isSignin = mode === 'signin';
    const title = isSignin ? 'Welcome Back' : 'Create Account';
    const subtitle = isSignin ? 'Sign in to manage your collection' : 'Sign up to get started';
    const btnText = isSignin ? 'Sign In' : 'Sign Up';
    const toggleText = isSignin ? "Don't have an account? Sign Up" : "Already have an account? Sign In";
    const toggleAction = isSignin ? "renderAuthView('signup')" : "renderAuthView('signin')";

    const html = `
        <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in transition-colors">
            <!-- Header -->
            <div class="bg-gradient-to-r from-primary to-secondary p-8 text-center">
                <div class="mx-auto bg-white dark:bg-gray-800/20 w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
                    <i data-lucide="flower-2" class="text-white h-8 w-8"></i>
                </div>
                <h2 class="text-2xl font-bold text-white mb-1">${title}</h2>
                <p class="text-indigo-100 text-sm">${subtitle}</p>
            </div>
            
            <!-- Form -->
            <div class="p-8 space-y-5">
                ${!isSignin ? `
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Full Name</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i data-lucide="user" class="h-5 w-5 text-gray-400"></i>
                        </div>
                        <input type="text" id="auth-name" placeholder="John Doe"
                            class="w-full pl-10 pr-4 py-3 bg-appbg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white">
                    </div>
                </div>
                ` : ''}
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Username</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i data-lucide="at-sign" class="h-5 w-5 text-gray-400"></i>
                        </div>
                        <input type="text" id="auth-username" placeholder="username"
                            class="w-full pl-10 pr-4 py-3 bg-appbg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Password</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i data-lucide="lock" class="h-5 w-5 text-gray-400"></i>
                        </div>
                        <input type="password" id="auth-password" placeholder="••••••••"
                            class="w-full pl-10 pr-4 py-3 bg-appbg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all dark:text-white">
                    </div>
                </div>

                <button onclick="${isSignin ? 'signin()' : 'signup()'}" 
                    class="w-full bg-gradient-to-r from-primary to-secondary hover:from-[#2eb04f] hover:to-[#006bd6] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 transform transition-all active:scale-[0.98]">
                    ${btnText}
                </button>
                
                <div class="text-center pt-2">
                    <button onclick="${toggleAction}" class="text-sm text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-indigo-400 transition-colors font-medium">
                        ${toggleText}
                    </button>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    lucide.createIcons();

    // Enter key support
    const inputs = container.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (isSignin) signin();
                else signup();
            }
        });
    });
}

async function signin() {
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        alert('Please fill in all fields');
        return;
    }

    const hashedPassword = await hashPassword(password);
    // Backward compatibility: check against plain text (old users) or hashed (new users)
    const user = state.users.find(u => u.username === username && (u.password === hashedPassword || u.password === password));

    if (user) {
        // Auto-migrate to hash if it was plain text
        if (user.password === password) {
            user.password = hashedPassword;
            saveData(false);
        }
        state.currentUser = user;
        saveData();
        checkAuth();
    } else {
        alert('Invalid username or password');
    }
}

async function signup() {
    const nameInput = document.getElementById('auth-name');
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');

    const name = nameInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!name || !username || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (state.users.some(u => u.username === username)) {
        alert('Username already exists');
        return;
    }

    const hashedPassword = await hashPassword(password);

    const newUser = {
        name,
        username,
        password: hashedPassword
    };

    state.users.push(newUser);
    state.currentUser = newUser;
    saveData();
    checkAuth();
}

function logout() {
    state.currentUser = null;
    saveData(); // Save logged out state
    // Don't just checkAuth, trigger a full reload to clear any memory states if needed, or just re-render
    checkAuth();
}



// --- Navigation ---

let currentTab = 'entries';

function switchTab(tab) {
    currentTab = tab;

    // Update UI classes
    document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(el => {
        if (el.dataset.tab === tab) {
            el.classList.add('text-primary', 'bg-appbg', 'dark:bg-gray-900', 'dark:bg-gray-700', 'dark:text-white');
            el.classList.remove('text-gray-600', 'text-gray-500', 'dark:text-gray-300', 'dark:text-gray-400');
            if (el.classList.contains('nav-item-mobile')) el.classList.add('text-primary');
        } else {
            el.classList.remove('text-primary', 'bg-appbg', 'dark:bg-gray-900', 'dark:bg-gray-700', 'dark:text-white');
            el.classList.add('text-gray-600', 'dark:text-gray-300');
            if (el.classList.contains('nav-item-mobile')) el.classList.add('text-gray-500', 'dark:text-gray-400');
        }
    });

    renderCurrentView();
}

function renderCurrentView() {
    const main = document.getElementById('main-content');
    main.innerHTML = '';

    switch (currentTab) {
        case 'entries':
            renderEntriesView(main);
            break;
        case 'members':
            renderMembersView(main);
            break;
        case 'settings':
            renderSettingsView(main);
            break;
        case 'bills':
            renderBillsView(main);
            break;
        case 'profile':
            renderProfileView(main);
            break;
        case 'dashboard':
            renderDashboardView(main);
            break;
    }
    lucide.createIcons();
}

// --- Views ---

// -1. Dashboard View
function renderDashboardView(container) {
    // 1. Calculate Time Range
    const today = new Date();
    let startDate = new Date();
    let queryLabels = [];

    // Determine Start Date based on Filter
    if (dashboardFilter === 'today') {
        startDate = today;
    } else if (dashboardFilter === 'week') {
        startDate.setDate(today.getDate() - 6); // Last 7 days
    } else if (dashboardFilter === 'month') {
        startDate.setDate(1); // 1st of current month
    } else if (dashboardFilter === 'year') {
        startDate.setMonth(0, 1); // Jan 1st
    } else if (dashboardFilter === 'all') {
        startDate = new Date(0); // Epoch
    }

    // Helper to get dates in range
    const getDatesInRange = (start, end) => {
        const arr = [];
        const dt = new Date(start);
        const endDt = new Date(end);
        dt.setHours(0, 0, 0, 0);
        endDt.setHours(0, 0, 0, 0);

        while (dt <= endDt) {
            const dateStr = dt.toLocaleDateString('en-CA');
            arr.push(dateStr);
            dt.setDate(dt.getDate() + 1);
        }
        return arr;
    };

    const dateRange = (dashboardFilter === 'today')
        ? [today.toLocaleDateString('en-CA')]
        : getDatesInRange(startDate, today);

    // 2. Aggregate Data
    let totalQty = 0;
    let totalGross = 0;
    let totalCommission = 0;
    let totalLuggage = 0;

    // Trend Data Arrays
    const trendMap = {}; // date -> { qty, rate }

    dateRange.forEach(dateStr => {
        const dayEntries = state.entries[dateStr] || {};
        const rate = state.dailyRates[dateStr] !== undefined ? state.dailyRates[dateStr] : state.settings.rate;

        let dailyQty = 0;
        Object.values(dayEntries).forEach(q => dailyQty += (parseFloat(q) || 0));

        // Accumulate Totals
        const dailyGross = dailyQty * rate;
        let dailyComm = 0;
        let dailyLug = 0;

        if (state.settings.commissionEnabled) {
            if (state.settings.commissionType === 'percent') {
                dailyComm = dailyGross * (state.settings.commissionAmount / 100);
            } else {
                if (Object.keys(dayEntries).length > 0) {
                    dailyComm = Object.keys(dayEntries).length * state.settings.commissionAmount;
                }
            }
        }

        if (state.settings.luggageEnabled) {
            dailyLug = dailyQty * (state.settings.luggageAmount || 0);
        }

        totalQty += dailyQty;
        totalGross += dailyGross;
        totalCommission += dailyComm;
        totalLuggage += dailyLug;

        // Trend Map Population
        trendMap[dateStr] = { qty: dailyQty, rate: rate };
    });

    const netProfit = totalGross - totalCommission - totalLuggage; // To Farmers
    const collectorIncome = totalCommission + totalLuggage; // My Income

    // Prepare Chart Data
    const chartLabels = [];
    const chartQty = [];
    const chartRate = [];

    dateRange.forEach(d => {
        chartLabels.push(d.slice(5)); // MM-DD
        chartQty.push(trendMap[d] ? trendMap[d].qty : 0);
        chartRate.push(trendMap[d] ? trendMap[d].rate : 0);
    });

    const html = `
        <div class="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 class="text-2xl font-bold dark:text-white">Dashboard Overview</h2>
                <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
                    <select onchange="updateDashboardFilter(this.value)" class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none dark:text-white shadow-sm cursor-pointer hover:border-gray-400">
                        <option value="today" ${dashboardFilter === 'today' ? 'selected' : ''}>Today</option>
                        <option value="week" ${dashboardFilter === 'week' ? 'selected' : ''}>This Week</option>
                        <option value="month" ${dashboardFilter === 'month' ? 'selected' : ''}>This Month</option>
                        <option value="year" ${dashboardFilter === 'year' ? 'selected' : ''}>This Year</option>
                        <option value="all" ${dashboardFilter === 'all' ? 'selected' : ''}>All Time</option>
                    </select>
                </div>
            </div>
            
            <!-- Financial Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Total Quantity -->
                <div class="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-softer border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Weight</p>
                            <h3 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">${totalQty.toFixed(2)} <span class="text-sm font-normal text-gray-400">kg</span></h3>
                        </div>
                        <div class="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <i data-lucide="scale" class="h-5 w-5"></i>
                        </div>
                    </div>
                </div>

                <!-- Gross Value -->
                <div class="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-softer border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                     <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Value</p>
                            <h3 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹ ${totalGross.toLocaleString('en-IN')}</h3>
                        </div>
                        <div class="p-2 bg-primary/10 dark:bg-primary/20/20 text-primary rounded-lg">
                            <i data-lucide="banknote" class="h-5 w-5"></i>
                        </div>
                    </div>
                </div>

                <!-- Your Income (Commission) -->
                <div class="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-softer border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                     <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">My Income</p>
                            <h3 class="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">₹ ${collectorIncome.toLocaleString('en-IN')}</h3>
                            <p class="text-[10px] text-gray-400 mt-1">Comm. + Luggage</p>
                        </div>
                        <div class="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                            <i data-lucide="trending-up" class="h-5 w-5"></i>
                        </div>
                    </div>
                </div>

                <!-- Net Payable -->
                <div class="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-softer border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                     <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-medium text-red-500 uppercase tracking-wide">Net Payable</p>
                            <h3 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹ ${netProfit.toLocaleString('en-IN')}</h3>
                            <p class="text-[10px] text-gray-400 mt-1">To Members</p>
                        </div>
                        <div class="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
                            <i data-lucide="wallet" class="h-5 w-5"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <!-- Main Trend Chart -->
                 <div class="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-softer border border-gray-100 dark:border-gray-700">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Collection Trend & Daily Rates</h3>
                    <div class="relative h-72 w-full">
                        <canvas id="trendChart"></canvas>
                    </div>
                 </div>
                 
                 <!-- Members Pie -->
                 <div class="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-softer border border-gray-100 dark:border-gray-700">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Members by Location</h3>
                    <div class="relative h-64 w-full">
                        <canvas id="locationChart"></canvas>
                    </div>
                 </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Initialize Charts

    // 1. Location Pie
    const locationCounts = {};
    state.members.forEach(m => {
        const loc = m.location || 'Unknown';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    new Chart(document.getElementById('locationChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(locationCounts),
            datasets: [{
                data: Object.values(locationCounts),
                backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
    });

    // 2. Trend Mixed Chart
    new Chart(document.getElementById('trendChart'), {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Collection (kg)',
                    data: chartQty,
                    backgroundColor: 'rgba(52, 199, 89, 0.7)',
                    hoverBackgroundColor: 'rgba(52, 199, 89, 0.9)',
                    borderColor: '#34C759',
                    borderWidth: 0,
                    borderRadius: 4,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Rate (₹)',
                    data: chartRate,
                    type: 'line',
                    borderColor: '#007AFF',
                    backgroundColor: '#007AFF',
                    borderWidth: 3,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8,
                    displayColors: true
                },
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, boxWidth: 8 }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: { display: true, text: 'Weight (kg)' },
                    grid: { borderDash: [2, 4], color: '#e5e7eb' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Rate (₹)' }
                }
            }
        }
    });
}


// 0. Profile View
function renderProfileView(container) {
    const user = state.currentUser;
    const settings = state.settings;

    const html = `
        <div class="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <!-- User Profile Card -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6 transition-colors">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        ${getInitials(user.name)}
                    </div>
                    <div>
                        <h2 class="text-xl font-bold dark:text-white">${user.name}</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">@${user.username}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                        <input type="text" value="${user.name}" readonly
                            class="w-full bg-appbg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-gray-500 dark:text-gray-400 cursor-not-allowed">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                        <input type="text" value="${user.username}" readonly
                            class="w-full bg-appbg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-gray-500 dark:text-gray-400 cursor-not-allowed">
                    </div>
                </div>
            </div>

            <!-- Shop Branding Card -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6 transition-colors">
                <div class="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <i data-lucide="store" class="text-primary h-6 w-6"></i>
                    <h2 class="text-xl font-bold dark:text-white">Shop Branding</h2>
                </div>

                <div class="space-y-6">
                    <!-- Shop Name -->
                     <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Name / Title</label>
                        <input type="text" value="${settings.shopName || ''}" placeholder="e.g. Green Valley Flowers"
                            onchange="updateSetting('shopName', this.value)"
                            class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-primary outline-none transition-all">
                        <p class="text-xs text-gray-500 mt-1">This will appear on your generated bills.</p>
                    </div>

                    <!-- Logo & Banner Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Logo Upload -->
                        <div class="space-y-2">
                             <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop Logo</label>
                             <div class="relative group cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:bg-appbg dark:hover:bg-gray-700/50 transition-colors h-48 flex flex-col items-center justify-center text-center">
                                <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onchange="handleBrandingUpload(this, 'logo')">
                                
                                ${settings.logo ?
            `<img src="${settings.logo}" class="max-h-full max-w-full object-contain z-0">
                                     <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white z-0 rounded-lg">
                                        <span>Click to Change</span>
                                     </div>`
            :
            `<div class="text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                                        <i data-lucide="image-plus" class="h-8 w-8"></i>
                                        <span class="text-sm">Upload Logo</span>
                                     </div>`
        }
                             </div>
                             ${settings.logo ? `<button onclick="updateSetting('logo', null)" class="text-xs text-red-500 hover:text-red-700 underline">Remove Logo</button>` : ''}
                        </div>

                        <!-- Banner Upload -->
                        <div class="space-y-2">
                             <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Shop Banner</label>
                             <div class="relative group cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:bg-appbg dark:hover:bg-gray-700/50 transition-colors h-48 flex flex-col items-center justify-center text-center">
                                <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onchange="handleBrandingUpload(this, 'banner')">
                                
                                ${settings.banner ?
            `<img src="${settings.banner}" class="max-h-full max-w-full object-cover z-0 rounded">
                                     <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white z-0 rounded-lg">
                                        <span>Click to Change</span>
                                     </div>`
            :
            `<div class="text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                                        <i data-lucide="image" class="h-8 w-8"></i>
                                        <span class="text-sm">Upload Banner</span>
                                     </div>`
        }
                             </div>
                             ${settings.banner ? `<button onclick="updateSetting('banner', null)" class="text-xs text-red-500 hover:text-red-700 underline">Remove Banner</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function handleBrandingUpload(input, type) {
    if (input.files && input.files[0]) {
        // Use the existing resizeImage function but maybe with larger dimensions for banner
        const isBanner = type === 'banner';
        resizeImageGeneric(input.files[0], isBanner ? 800 : 300, isBanner ? 400 : 300, (dataUrl) => {
            updateSetting(type, dataUrl);
            // Re-render handled by updateSetting -> saveData -> renderCurrentView
        });
    }
}

// Helper to resize with custom max dimensions
function resizeImageGeneric(file, maxX, maxY, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxX) {
                    height *= maxX / width;
                    width = maxX;
                }
            } else {
                if (height > maxY) {
                    width *= maxY / height;
                    height = maxY;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            callback(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 1. Members View
let memberSort = 'az'; // Default to A-Z as requested ('az', 'za', 'newest', 'oldest')

// Dashboard Filter
let dashboardFilter = 'month'; // 'today', 'week', 'month', 'year', 'all'

function updateDashboardFilter(val) {
    dashboardFilter = val;
    const main = document.getElementById('main-content');
    renderDashboardView(main);
}

function renderMembersView(container) {
    let sortedMembers = [...state.members];
    if (memberSort === 'az') sortedMembers.sort((a, b) => a.name.localeCompare(b.name));
    if (memberSort === 'za') sortedMembers.sort((a, b) => b.name.localeCompare(a.name));
    if (memberSort === 'newest') sortedMembers.sort((a, b) => b.id - a.id);
    if (memberSort === 'oldest') sortedMembers.sort((a, b) => a.id - b.id);

    const html = `
        <div class="max-w-2xl mx-auto animate-fade-in">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 transition-colors hover-scale">
                <h2 class="text-lg font-semibold mb-4 dark:text-white">Add New Member</h2>
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col md:flex-row gap-2 items-center">
                         <div class="flex-shrink-0 relative group">
                            <label for="new-member-pic" class="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors overflow-hidden border border-gray-300 dark:border-gray-600 text-gray-400">
                                <i data-lucide="camera" class="h-5 w-5 absolute z-10 transition-opacity duration-200"></i>
                                <img id="new-member-preview" class="hidden w-full h-full object-cover z-20">
                            </label>
                            <input type="file" id="new-member-pic" accept="image/*" class="hidden" onchange="previewNewMemberImage(this)">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                            <input type="text" id="new-member-name" placeholder="Member Name" 
                                class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                            <input type="tel" id="new-member-mobile" placeholder="Mobile Number" 
                                class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                             <input type="text" id="new-member-location" placeholder="Location/Area" 
                                class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                        </div>
                         
                        <button onclick="addMember()" class="w-full md:w-auto bg-primary text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors btn-press whitespace-nowrap">
                            Add Member
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
                    <h2 class="text-lg font-semibold dark:text-white">Member List (${state.members.length})</h2>
                    <div class="flex gap-2 text-sm items-center">
                        <label class="cursor-pointer bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium flex items-center gap-1.5 mr-2">
                            <i data-lucide="upload" class="h-4 w-4"></i> Import CSV
                            <input type="file" accept=".csv" class="hidden" onchange="importMembersCSV(this)">
                        </label>
                        <select onchange="sortMembers(this.value)" class="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 outline-none focus:ring-primary">
                            <option value="newest" ${memberSort === 'newest' ? 'selected' : ''}>Newest First</option>
                            <option value="oldest" ${memberSort === 'oldest' ? 'selected' : ''}>Oldest First</option>
                            <option value="az" ${memberSort === 'az' ? 'selected' : ''}>Name (A-Z)</option>
                            <option value="za" ${memberSort === 'za' ? 'selected' : ''}>Name (Z-A)</option>
                        </select>
                    </div>
                </div>
                <ul class="divide-y divide-gray-200 dark:divide-gray-700">
                    ${sortedMembers.map((m, index) => `
                        <li class="px-6 py-4 flex justify-between items-center hover:bg-appbg dark:hover:bg-gray-700 transition-colors animate-slide-in" style="animation-delay: ${index * 0.05}s">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                                    ${m.profilePic ? `<img src="${m.profilePic}" class="w-full h-full object-cover" alt="${m.name}">` : `<span class="text-sm font-bold text-gray-600 dark:text-gray-300">${getInitials(m.name)}</span>`}
                                </div>
                                <div>
                                    <div class="font-medium text-gray-900 dark:text-white">${m.name}</div>
                                    <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        ${m.mobile ? `<span class="flex items-center gap-1"><i data-lucide="phone" class="h-3 w-3"></i> ${m.mobile}</span>` : ''}
                                        ${m.location ? `<span class="flex items-center gap-1"><i data-lucide="map-pin" class="h-3 w-3"></i> ${m.location}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="openEditMemberModal(${m.id})" class="text-blue-600 hover:text-blue-400 p-1 btn-press" title="Edit">
                                    <i data-lucide="pencil" class="h-4 w-4"></i>
                                </button>
                                <button onclick="deleteMember(${m.id})" class="text-red-500 hover:text-red-400 p-1 btn-press" title="Delete">
                                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                                </button>
                            </div>
                        </li>
                    `).join('')}
                    ${state.members.length === 0 ? '<li class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No members added yet.</li>' : ''}
                </ul>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function sortMembers(val) {
    memberSort = val;
    renderCurrentView();
}

function importMembersCSV(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const lines = text.split('\\n');
        let added = 0;
        let dup = 0;
        for (let i = 1; i < lines.length; i++) { // Skip header
            const line = lines[i].trim();
            if (!line) continue;
            // Basic CSV split, assuming no commas within fields
            const parts = line.split(',');
            if (parts.length >= 1) {
                const name = parts[0].trim();
                const mobile = parts[1] ? parts[1].trim() : '';
                const location = parts[2] ? parts[2].trim() : '';
                if (name) {
                    if (mobile && state.members.some(m => m.mobile === mobile)) {
                        dup++;
                        continue;
                    }
                    state.members.push({
                        id: Date.now() + Math.random(),
                        name, mobile, location, profilePic: null, advance: 0
                    });
                    added++;
                }
            }
        }
        if (added > 0) {
            logActivity('CSV Import', `Imported ${added} members.`);
            saveData();
        }
        alert(`Imported ${added} members.\\n${dup} duplicate(s) skipped.`);
        input.value = ''; // reset
    };
    reader.readAsText(input.files[0]);
}

function getInitials(name) {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
}

function resizeImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxWidth = 300;
            const maxHeight = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Compress
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            callback(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function previewNewMemberImage(input) {
    if (input.files && input.files[0]) {
        resizeImage(input.files[0], (dataUrl) => {
            const img = document.getElementById('new-member-preview');
            const icon = input.parentElement.querySelector('i');
            img.src = dataUrl;
            img.classList.remove('hidden');
            if (icon) icon.classList.add('opacity-0');
        });
    }
}

function addMember() {
    const nameInput = document.getElementById('new-member-name');
    const mobileInput = document.getElementById('new-member-mobile');
    const picInput = document.getElementById('new-member-pic');
    const name = nameInput.value.trim();
    const mobile = mobileInput.value.trim();
    const locationInput = document.getElementById('new-member-location');
    const locationVal = locationInput.value.trim();

    if (name) {
        const save = (picDataUrl) => {
            state.members.push({
                id: Date.now(),
                name,
                mobile,
                location: locationVal,
                profilePic: picDataUrl || null,
                advance: 0
            });
            logActivity('Add Member', `Added member: ${name}`);
            saveData();
        };

        if (picInput.files && picInput.files[0]) {
            resizeImage(picInput.files[0], (dataUrl) => {
                save(dataUrl);
            });
        } else {
            save(null);
        }
    }
}

// Modal State
let currentEditId = null;
let currentEditPic = null;

function openEditMemberModal(id) {
    const member = state.members.find(m => m.id === id);
    if (!member) return;

    currentEditId = id;
    currentEditPic = member.profilePic;

    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const saveBtn = document.getElementById('modal-save-btn');
    const overlay = document.getElementById('modal-overlay');
    const modalContent = overlay.firstElementChild;

    modalTitle.innerText = 'Edit Member';

    modalBody.innerHTML = `
        <div class="flex flex-col items-center mb-4">
            <label for="edit-member-pic" class="cursor-pointer relative w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors overflow-hidden border-4 border-white dark:border-gray-600 shadow-lg">
                <img id="edit-member-preview" src="${member.profilePic || ''}" class="${member.profilePic ? '' : 'hidden'} w-full h-full object-cover z-20 relative">
                <div id="edit-member-placeholder" class="${member.profilePic ? 'hidden' : 'flex'} w-full h-full absolute inset-0 items-center justify-center text-gray-400 z-10">
                    <i data-lucide="camera" class="h-8 w-8"></i>
                </div>
            </label>
            <input type="file" id="edit-member-pic" accept="image/*" class="hidden" onchange="previewEditMemberImage(this)">
            <button onclick="removeEditMemberImage()" class="text-xs text-red-500 hover:text-red-600 mt-3 font-medium">Remove Photo</button>
        </div>
        
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input type="text" id="edit-member-name" value="${member.name}" class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
                <input type="tel" id="edit-member-mobile" value="${member.mobile || ''}" class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location / Area</label>
                <input type="text" id="edit-member-location" value="${member.location || ''}" class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Advance Balance / Khata (₹)</label>
                <input type="number" id="edit-member-advance" value="${member.advance || 0}" class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                <p class="text-xs text-gray-500 mt-1">This amount will be deducted from their next bill.</p>
            </div>
        </div>
    `;

    lucide.createIcons();
    saveBtn.onclick = saveEditMember;

    overlay.classList.remove('hidden');
    // Force reflow
    void overlay.offsetWidth;

    overlay.classList.remove('opacity-0');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');
}

function closeModal(event) {
    if (event && event.target.id !== 'modal-overlay') return;

    const overlay = document.getElementById('modal-overlay');
    const modalContent = overlay.firstElementChild;

    overlay.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);
}

function previewEditMemberImage(input) {
    if (input.files && input.files[0]) {
        resizeImage(input.files[0], (dataUrl) => {
            const img = document.getElementById('edit-member-preview');
            const ph = document.getElementById('edit-member-placeholder');
            img.src = dataUrl;
            img.classList.remove('hidden');
            ph.classList.add('hidden');
            currentEditPic = dataUrl;
        });
    }
}

function removeEditMemberImage() {
    const img = document.getElementById('edit-member-preview');
    const ph = document.getElementById('edit-member-placeholder');
    const input = document.getElementById('edit-member-pic');

    img.removeAttribute('src');
    img.classList.add('hidden');
    ph.classList.remove('hidden');
    input.value = '';
    currentEditPic = null;
}

function saveEditMember() {
    const nameInput = document.getElementById('edit-member-name');
    const mobileInput = document.getElementById('edit-member-mobile');
    const locationInput = document.getElementById('edit-member-location');
    const advanceInput = document.getElementById('edit-member-advance');

    if (currentEditId && nameInput.value.trim()) {
        const member = state.members.find(m => m.id === currentEditId);
        if (member) {
            member.name = nameInput.value.trim();
            member.mobile = mobileInput.value.trim();
            member.location = locationInput.value.trim();
            member.advance = parseFloat(advanceInput.value) || 0;
            member.profilePic = currentEditPic;
            logActivity('Edit Member', `Updated member: ${member.name}`);
            saveData();
            closeModal();
        }
    }
}

function editMember(id) {
    openEditMemberModal(id);
}

function deleteMember(id) {
    if (confirm('Delete this member?')) {
        const member = state.members.find(m => m.id === id);
        if (member) logActivity('Delete Member', `Removed member: ${member.name}`);
        state.members = state.members.filter(m => m.id !== id);
        saveData();
    }
}

// 2. Settings View
function renderSettingsView(container) {
    const html = `
        <div class="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors animate-fade-in">
            <h2 class="text-xl font-bold mb-6 dark:text-white">Billing Settings</h2>
            
            <div class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Rate (per unit)</label>
                    <input type="number" value="${state.settings.rate}" onchange="updateSetting('rate', this.value)"
                        class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-primary outline-none">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">This is the default rate. You can override this per day in the "Daily Entries" tab.</p>
                </div>

                <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div class="flex items-center justify-between mb-4">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Commission Deduction</label>
                        <input type="checkbox" ${state.settings.commissionEnabled ? 'checked' : ''} 
                            onchange="updateSetting('commissionEnabled', this.checked)"
                            class="h-5 w-5 text-primary rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary">
                    </div>
                    ${state.settings.commissionEnabled ? `
                        <div class="ml-6 space-y-3">
                            <div>
                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Commission Type</label>
                                <div class="flex gap-4">
                                    <label class="flex items-center gap-2 text-sm dark:text-gray-300">
                                        <input type="radio" name="commType" value="fixed" 
                                            ${state.settings.commissionType === 'fixed' ? 'checked' : ''}
                                            onchange="updateSetting('commissionType', 'fixed')"
                                            class="text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600">
                                        Fixed Amount
                                    </label>
                                    <label class="flex items-center gap-2 text-sm dark:text-gray-300">
                                        <input type="radio" name="commType" value="percent" 
                                            ${state.settings.commissionType === 'percent' ? 'checked' : ''}
                                            onchange="updateSetting('commissionType', 'percent')"
                                            class="text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600">
                                        Percentage (%)
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    ${state.settings.commissionType === 'percent' ? 'Percentage Value (%)' : 'Amount (Flat)'}
                                </label>
                                <input type="number" value="${state.settings.commissionAmount}" onchange="updateSetting('commissionAmount', this.value)"
                                    class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-primary outline-none">
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div class="flex items-center justify-between mb-4">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Luggage Charge Deduction</label>
                        <input type="checkbox" ${state.settings.luggageEnabled ? 'checked' : ''} 
                            onchange="updateSetting('luggageEnabled', this.checked)"
                            class="h-5 w-5 text-primary rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary">
                    </div>
                    ${state.settings.luggageEnabled ? `
                        <div class="ml-6">
                            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">Luggage Rate (per Kg)</label>
                            <input type="number" value="${state.settings.luggageAmount}" onchange="updateSetting('luggageAmount', this.value)"
                                placeholder="e.g. 2.00"
                                class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-primary outline-none">
                        </div>
                    ` : ''}
                </div>

                <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div class="flex items-center justify-between mb-4">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Activity & Audit Logs</label>
                        <button onclick="viewAuditLogs()" class="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-xl text-sm transition-colors">
                            View Logs
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function viewAuditLogs() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in';
    modal.onclick = (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    };

    const logsHtml = (state.auditLogs || []).map(log => `
        <div class="border-b border-gray-100 dark:border-gray-700 py-3 last:border-0">
            <div class="flex justify-between items-start mb-1">
                <span class="font-medium text-sm text-gray-900 dark:text-white">${log.action}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${new Date(log.time).toLocaleString()}</span>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-300">${log.details}</p>
            <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-1">User: ${log.user}</p>
        </div>
    `).join('') || '<div class="text-center py-8 text-gray-500 text-sm">No activity logs yet.</div>';

    const content = document.createElement('div');
    content.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col relative';
    content.innerHTML = `
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 rounded-t-lg">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><i data-lucide="shield-alert" class="h-5 w-5 text-indigo-500"></i> Audit Logs</h3>
            <button onclick="this.closest('.fixed').remove()" class="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200">
                <i data-lucide="x" class="h-4 w-4"></i>
            </button>
        </div>
        <div class="p-6 overflow-y-auto flex-1">
            ${logsHtml}
        </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
}

function updateSetting(key, value) {
    if (key === 'rate' || key === 'commissionAmount' || key === 'luggageAmount') {
        value = parseFloat(value) || 0;
    }
    state.settings[key] = value;
    saveData();
}

// 3. Entries View
let currentEntryDate = new Date().toISOString().split('T')[0];


function renderEntriesView(container) {
    // Check if a specific rate is set for this day  
    const isDailyRateSet = state.dailyRates[currentEntryDate] !== undefined;
    // Effective rate is daily rate OR default rate
    const effectiveRate = isDailyRateSet ? state.dailyRates[currentEntryDate] : state.settings.rate;

    const html = `
        <div class="max-w-4xl mx-auto animate-fade-in">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 sticky top-0 z-10 space-y-3 transition-colors">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold dark:text-white">Daily Entries</h2>
                    <div class="flex gap-2 items-center">
                        <button onclick="renderRateManager()" class="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-3 py-1 rounded-xl text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors mr-2">
                            Manage Rates
                        </button>
                        
                        <button onclick="navigateDate(-1)" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Previous Day">
                            <i data-lucide="chevron-left" class="h-5 w-5"></i>
                        </button>
                        
                        <input type="date" value="${currentEntryDate}" onchange="changeDate(this.value)"
                            class="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-primary outline-none">
                            
                        <button onclick="navigateDate(1)" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Next Day">
                            <i data-lucide="chevron-right" class="h-5 w-5"></i>
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-3 bg-primary/10 dark:bg-primary/20/30 p-3 rounded-xl">
                    <label class="text-sm font-medium text-indigo-900 dark:text-indigo-200">Rate for this day:</label>
                    <div class="flex items-center gap-2">
                        <input type="number" 
                            value="${isDailyRateSet ? effectiveRate : ''}" 
                            placeholder="${state.settings.rate} (Default)" 
                            onchange="updateDayRate(this.value)"
                            class="w-32 border ${isDailyRateSet ? 'border-primary ring-1 ring-primary' : 'border-indigo-200 dark:border-indigo-700'} dark:bg-gray-700 dark:text-white rounded px-2 py-1 text-sm focus:ring-primary outline-none">
                        ${isDailyRateSet ?
            `<button onclick="updateDayRate('')" class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400" title="Reset to Default Rate">
                                <i data-lucide="x" class="h-4 w-4"></i>
                            </button>`
            : '<span class="text-xs text-gray-500 dark:text-gray-400 italic">Using default</span>'}
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
                <div class="grid grid-cols-12 bg-appbg dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div class="col-span-8 px-6 py-3">Member Name</div>
                    <div class="col-span-4 px-6 py-3 text-right">Quantity</div>
                </div>
                <div class="divide-y divide-gray-200 dark:divide-gray-700">
                    ${state.members.map(m => {
                const val = (state.entries[currentEntryDate] && state.entries[currentEntryDate][m.id]) || '';
                return `
                        <div class="grid grid-cols-12 items-center hover:bg-appbg dark:hover:bg-gray-700 transition-colors">
                            <div class="col-span-8 px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                                    ${m.profilePic ? `<img src="${m.profilePic}" class="w-full h-full object-cover" alt="${m.name}">` : `<span class="font-bold text-gray-600 dark:text-gray-300">${getInitials(m.name)}</span>`}
                                </div>
                                <span class="truncate">${m.name}</span>
                            </div>
                            <div class="col-span-4 px-6 py-2">
                                <input type="number" value="${val}" placeholder="0"
                                    onchange="updateEntry(${m.id}, this)"
                                    class="w-full text-right border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-primary outline-none">
                            </div>
                        </div>
                        `;
            }).join('')}
                    ${state.members.length === 0 ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No members found. Go to Members tab to add some.</div>' : ''}
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function changeDate(date) {
    currentEntryDate = date;
    renderCurrentView();
}

function navigateDate(days) {
    const date = new Date(currentEntryDate);
    date.setDate(date.getDate() + days);
    currentEntryDate = date.toISOString().split('T')[0];
    renderCurrentView();
}

function updateDayRate(val) {
    const num = parseFloat(val);
    if (val === '' || val === null || isNaN(num)) {
        delete state.dailyRates[currentEntryDate];
    } else {
        state.dailyRates[currentEntryDate] = num;
    }
    saveData();
    renderCurrentView();
}

function updateEntry(memberId, inputOrValue) {
    let value;
    let inputEl = null;

    // Handle both direct value (legacy) and input element (new)
    if (typeof inputOrValue === 'object' && inputOrValue.value !== undefined) {
        inputEl = inputOrValue;
        value = inputEl.value;
    } else {
        value = inputOrValue;
    }

    if (!state.entries[currentEntryDate]) {
        state.entries[currentEntryDate] = {};
    }
    if (value === '') {
        delete state.entries[currentEntryDate][memberId];
    } else {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            // Subtract 0.1 (bag weight) and fix precision
            const adjusted = parseFloat((num - 0.1).toFixed(3));

            const oldVal = state.entries[currentEntryDate][memberId];
            if (oldVal !== adjusted) {
                logActivity('Update Entry', `Date: ${currentEntryDate}, PID: ${memberId}, Qty: ${oldVal || 0} -> ${adjusted}`);
            }

            state.entries[currentEntryDate][memberId] = adjusted;

            // Update UI immediately if we have the element
            if (inputEl) {
                inputEl.value = adjusted;
            }
        }
    }
    saveData(false);
}

// --- Rate Manager View ---

function renderRateManager() {
    const main = document.getElementById('main-content');

    // Generate dates for the current month of currentEntryDate
    const [year, month] = currentEntryDate.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
        dates.push(`${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }

    const datesFirstHalf = dates.filter(d => parseInt(d.split('-')[2]) <= 15);
    const datesSecondHalf = dates.filter(d => parseInt(d.split('-')[2]) > 15);

    const renderCard = (date) => {
        const dayRate = state.dailyRates[date];
        const isSet = dayRate !== undefined;
        return `
        <div class="border border-gray-200 dark:border-gray-700 rounded-xl p-3 ${isSet ? 'bg-primary/10 dark:bg-primary/20/20 border-indigo-200 dark:border-indigo-800' : ''} hover-scale transition-all">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">${date.split('-').reverse().join('-')}</div>
            <div class="flex items-center gap-2">
                <span class="text-gray-500 dark:text-gray-400 text-sm">₹</span>
                <input type="number" value="${isSet ? dayRate : ''}" placeholder="${state.settings.rate}"
                    onchange="updateBulkRate('${date}', this.value)"
                    class="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary outline-none text-gray-900 dark:text-white font-medium">
            </div>
        </div>
        `;
    };

    const html = `
        <div class="max-w-5xl mx-auto animate-fade-in">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold dark:text-white">Manage Rates - ${year}-${String(month).padStart(2, '0')}</h2>
                <button onclick="switchTab('entries')" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-white dark:text-gray-400 dark:hover:text-white transition-colors">
                    <i data-lucide="arrow-left" class="h-5 w-5"></i>
                    Back to Entries
                </button>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 transition-colors">
                <h3 class="text-lg font-semibold mb-4 dark:text-white">Bulk Update</h3>
                <div class="flex flex-wrap gap-4 items-end">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate Amount</label>
                        <input type="number" id="bulk-rate-input" placeholder="Enter Rate"
                            class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2 focus:ring-primary outline-none">
                    </div>
                    <button onclick="applyBulkRate(1, 'bulk-rate-input')" class="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors">
                        Apply to 1st Half (1-15)
                    </button>
                    <button onclick="applyBulkRate(2, 'bulk-rate-input')" class="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 px-4 py-2 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                        Apply to 2nd Half (16-End)
                    </button>
                    <button onclick="applyBulkRate(3, 'bulk-rate-input')" class="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        Apply to All Days
                    </button>
                </div>
            </div>

            <!-- 1st Half -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors mb-6 border-l-4 border-indigo-500">
                <div class="px-6 py-3 bg-primary/10 dark:bg-primary/20/20 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                    <h3 class="font-semibold text-indigo-700 dark:text-indigo-300">1st Half (1-15)</h3>
                    <button onclick="clearBulkRate(1)" class="text-xs bg-white dark:bg-gray-800 text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1 rounded transition-colors">
                        Clear Rates
                    </button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6">
                    ${datesFirstHalf.map(renderCard).join('')}
                </div>
            </div>

            <!-- 2nd Half -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors border-l-4 border-purple-500">
                <div class="px-6 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800 flex justify-between items-center">
                    <h3 class="font-semibold text-purple-700 dark:text-purple-300">2nd Half (16-End)</h3>
                    <button onclick="clearBulkRate(2)" class="text-xs bg-white dark:bg-gray-800 text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1 rounded transition-colors">
                        Clear Rates
                    </button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6">
                    ${datesSecondHalf.map(renderCard).join('')}
                </div>
            </div>
        </div>
    `;

    main.innerHTML = html;
    lucide.createIcons();
}

function updateBulkRate(date, val) {
    const num = parseFloat(val);
    if (val === '' || val === null || isNaN(num)) {
        delete state.dailyRates[date];
    } else {
        state.dailyRates[date] = num;
    }
    saveData(false);
}

function applyBulkRate(period, inputId) {
    const rateVal = document.getElementById(inputId).value;
    const rate = parseFloat(rateVal);

    if (rateVal === '' || isNaN(rate)) {
        alert("Please enter a valid rate first.");
        return;
    }

    const [year, month] = currentEntryDate.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        if (period === 1 && i > 15) continue;
        if (period === 2 && i <= 15) continue;

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        state.dailyRates[dateStr] = rate;
    }

    saveData();
    renderRateManager(); // Refresh view
}

function clearBulkRate(period) {
    let confirmationKeyword = "";
    let rangeText = "";

    if (period === 1) {
        confirmationKeyword = "RATEFIRST";
        rangeText = "1st Half (1-15)";
    } else if (period === 2) {
        confirmationKeyword = "RATESECOND";
        rangeText = "2nd Half (16-End)";
    } else {
        return;
    }

    const input = prompt(`WARNING: This will delete ALL rates for ${rangeText}.\nTo confirm, please type '${confirmationKeyword}' below:`);

    if (input === confirmationKeyword) {
        const [year, month] = currentEntryDate.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            if (period === 1 && i > 15) continue;
            if (period === 2 && i <= 15) continue;

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            delete state.dailyRates[dateStr];
        }
        saveData();
        renderRateManager();
    } else if (input !== null) {
        alert("Incorrect confirmation code. Action cancelled.");
    }
}

// 4. Bills View
let billMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
let billPeriod = new Date().getDate() <= 15 ? '1' : '2'; // '1' = 1-15, '2' = 16-End

function renderBillsView(container) {
    const html = `
        <!-- Printable Bill Template -->
        <div id="bill-template-container" class="hidden">
             <!-- This is the container that html2canvas will target -->
        </div>

    <div class="max-w-6xl mx-auto animate-fade-in">
            <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 class="text-2xl font-bold dark:text-white">Generated Bills</h2>
                
                <div class="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-soft border border-gray-200 dark:border-gray-700 transition-colors">
                    <div class="flex items-center gap-2">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Month:</label>
                        <input type="month" value="${billMonth}" onchange="updateBillSettings('month', this.value)"
                            class="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 text-sm focus:ring-primary outline-none">
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
                        <select onchange="updateBillSettings('period', this.value)"
                            class="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-2 py-1 text-sm focus:ring-primary outline-none">
                            <option value="1" ${billPeriod === '1' ? 'selected' : ''}>1st Half (1-15)</option>
                            <option value="2" ${billPeriod === '2' ? 'selected' : ''}>2nd Half (16-End)</option>
                        </select>
                    </div>
                    <button onclick="exportBillsCSV()" class="ml-auto md:ml-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800 transition-colors flex items-center gap-1.5">
                        <i data-lucide="download" class="h-4 w-4"></i> Export CSV
                    </button>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                ${state.members.map((m, index) => {
        const calc = calculateBill(m.id, billMonth, billPeriod);
        return `
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6 border border-gray-100 dark:border-gray-700 transition-colors hover-scale" style="animation-delay: ${index * 0.05}s">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-lg font-bold text-gray-900 dark:text-white">${m.name}</h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400">Total Qty: ${calc.totalQty.toFixed(3)}</p>
                            </div>
                            <span class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium px-2.5 py-0.5 rounded">
                                Net: ₹ ${calc.netPayable.toFixed(2)}
                            </span>
                        </div>
                        
                        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-6">
                            <div class="flex justify-between">
                                <span>Gross Amount:</span>
                                <span>₹ ${calc.grossAmount.toFixed(2)}</span>
                            </div>
                            ${state.settings.commissionEnabled ? `
                            <div class="flex justify-between text-red-500 dark:text-red-400">
                                <span>Commission ${state.settings.commissionType === 'percent' ? `(${state.settings.commissionAmount}%)` : ''}:</span>
                                <span>-₹ ${calc.commission.toFixed(2)}</span>
                            </div>` : ''}
                            ${state.settings.luggageEnabled ? `
                            <div class="flex justify-between text-red-500 dark:text-red-400">
                                <span>Luggage:</span>
                                <span>-₹ ${calc.luggage.toFixed(2)}</span>
                            </div>` : ''}
                            ${calc.advance > 0 ? `
                            <div class="flex justify-between text-red-500 dark:text-red-400 border-t border-gray-100 dark:border-gray-700 pt-1">
                                <span>Advance Deduction:</span>
                                <span>-₹ ${calc.advance.toFixed(2)}</span>
                            </div>` : ''}
                            <div class="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-white relative">
                                <span>Payable:</span>
                                <span>₹ ${calc.netPayable.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <button onclick="processBill(${m.id}, 'view')" class="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white px-2 py-2 rounded-xl hover:bg-appbg dark:hover:bg-gray-600 transition-colors" title="View Bill">
                                <i data-lucide="eye" class="h-4 w-4"></i>
                                View
                            </button>
                            <button onclick="processBill(${m.id}, 'download')" class="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white px-2 py-2 rounded-xl hover:bg-appbg dark:hover:bg-gray-600 transition-colors" title="Download as Image">
                                <i data-lucide="download" class="h-4 w-4"></i>
                                Download
                            </button>
                            <button onclick="processBill(${m.id}, 'whatsapp')" class="flex items-center justify-center gap-1.5 bg-[#25D366] text-white px-2 py-2 rounded-xl hover:bg-[#128C7E] transition-colors" title="Share to WhatsApp">
                                <i data-lucide="message-circle" class="h-4 w-4"></i>
                                WhatsApp
                            </button>
                            <button onclick="processBill(${m.id}, 'print')" class="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white px-2 py-2 rounded-xl hover:bg-appbg dark:hover:bg-gray-600 transition-colors" title="Print Bill">
                                <i data-lucide="printer" class="h-4 w-4"></i>
                                Print
                            </button>
                        </div>
                    </div>
                    `;
    }).join('')}
            </div>
             ${state.members.length === 0 ? '<div class="p-8 text-center text-gray-500 dark:text-gray-400">No members found.</div>' : ''}
        </div>
    `;
    container.innerHTML = html;
}

function updateBillSettings(type, value) {
    if (type === 'month') billMonth = value;
    if (type === 'period') billPeriod = value;
    renderCurrentView();
}

function exportBillsCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Name,Mobile,Total Kgs,Gross Amount,Commission,Luggage,Advance Deduction,Net Payable\\n";

    state.members.forEach(m => {
        const calc = calculateBill(m.id, billMonth, billPeriod);
        if (calc.totalQty > 0 || calc.advance > 0) { // Only export if they had activity
            const row = [
                m.id,
                `"${m.name}"`,
                m.mobile || '',
                calc.totalQty.toFixed(3),
                calc.grossAmount.toFixed(2),
                calc.commission.toFixed(2),
                calc.luggage.toFixed(2),
                calc.advance.toFixed(2),
                calc.netPayable.toFixed(2)
            ].join(",");
            csvContent += row + "\\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const periodLabel = billPeriod === '1' ? '1st-Half' : '2nd-Half';
    link.setAttribute("download", `FMS_Report_${billMonth}_${periodLabel}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    link.remove();
    logActivity('Export CSV', `Exported Bills for ${billMonth} (${periodLabel})`);
}

function calculateBill(memberId, month = billMonth, period = billPeriod) {
    let totalQty = 0;
    let grossAmount = 0;
    const details = [];

    // Generate all dates for the selected month/period
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const allDates = [];

    for (let i = 1; i <= daysInMonth; i++) {
        if (period === '1' && i > 15) continue;
        if (period === '2' && i <= 15) continue;

        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        allDates.push(dateStr);
    }

    allDates.forEach(date => {
        const dayEntries = state.entries[date];
        const qty = (dayEntries && dayEntries[memberId]) ? dayEntries[memberId] : 0;

        if (qty > 0) {
            const rate = state.dailyRates[date] !== undefined ? state.dailyRates[date] : state.settings.rate;
            const amount = qty * rate;

            totalQty += qty;
            grossAmount += amount;

            details.push({
                date,
                qty,
                rate,
                amount,
                status: ''
            });
        } else {
            details.push({
                date,
                qty: 0,
                rate: 0,
                amount: 0,
                status: 'No Flower'
            });
        }
    });

    let commission = 0;
    if (state.settings.commissionEnabled) {
        if (state.settings.commissionType === 'percent') {
            commission = grossAmount * (state.settings.commissionAmount / 100);
        } else {
            commission = state.settings.commissionAmount;
        }
    }

    let luggage = 0;
    if (state.settings.luggageEnabled) {
        // Luggage is now Rate * TotalQty
        const rate = state.settings.luggageAmount || 0;
        luggage = totalQty * rate;
    }

    const member = state.members.find(m => m.id === memberId);
    const advance = member ? (member.advance || 0) : 0;

    const netPayable = grossAmount - commission - luggage - advance;

    return {
        totalQty,
        grossAmount,
        commission,
        luggage,
        advance,
        netPayable,
        details
    };
}

// --- PDF Generation ---

async function processBill(memberId, action) {
    const member = state.members.find(m => m.id === memberId);
    const calc = calculateBill(memberId, billMonth, billPeriod);

    // Determine Billing Period Label
    const [year, month] = billMonth.split('-');
    const startDate = billPeriod === '1' ? `01/${month}/${year}` : `16/${month}/${year}`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = billPeriod === '1' ? `15/${month}/${year}` : `${lastDay}/${month}/${year}`;

    const shopName = state.settings.shopName || 'C.K.R FLOWERS';
    const logo = state.settings.logo;
    const banner = state.settings.banner;
    const ownerName = state.currentUser ? state.currentUser.name.toUpperCase() : 'K. RAMKUMAR';

    const billHtmlContent = `
        <div class="border-2 border-black bg-white dark:bg-gray-800 text-black relative overflow-hidden" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <!-- Header Banner -->
            ${banner ? `<div class="w-full h-32 bg-gray-200 border-b-2 border-black bg-cover bg-center" style="background-image: url('${banner}');"></div>` : ''}

            <!-- Header Info -->
            <div class="text-center border-b-2 border-black p-4 relative">
                ${logo ? `<img src="${logo}" class="absolute left-4 top-1/2 transform -translate-y-1/2 w-20 h-20 object-contain">` : ''}
                <div class="${logo ? 'px-20' : ''}">
                    <h1 class="text-3xl font-extrabold uppercase tracking-wide">${shopName}</h1>
                </div>
                <div class="flex justify-between items-center mt-3 px-4 text-sm font-semibold">
                    <span>OWNER: ${ownerName}</span>
                    <span>BILL NO. ${memberId.toString().slice(-4)}</span>
                </div>
            </div>

            <!-- Customer Info -->
            <div class="grid grid-cols-2 border-b-2 border-black text-sm font-bold bg-appbg dark:bg-gray-900">
                <div class="border-r-2 border-black p-3">
                    <div class="flex justify-between mb-1"><span>C. NAME :</span> <span class="uppercase text-lg">${member.name}</span></div>
                    <div class="flex justify-between"><span>C. ID :</span> <span>${member.id}</span></div>
                </div>
                <div class="p-3">
                    <div class="flex justify-between mb-1"><span>BILLING PERIOD :</span> <span class="text-blue-800">${startDate} TO ${endDate}</span></div>
                    <div class="flex justify-between"><span>FLOWER TYPE :</span> <span>SAMPANGI FLOWER</span></div>
                </div>
            </div>

            <!-- Table -->
            <table class="w-full text-sm border-collapse mt-2">
                <thead>
                    <tr class="bg-gray-100 border-b-2 border-black">
                        <th class="border-r border-black p-1 w-12 text-center">S.NO.</th>
                        <th class="border-r border-black p-1 text-center">DATE</th>
                        <th class="border-r border-black p-1 text-center">Status</th>
                        <th class="border-r border-black p-1 text-right">Kgs</th>
                        <th class="border-r border-black p-1 text-right">RATE</th>
                        <th class="p-1 text-right">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    ${calc.details.map((row, index) => `
                    <tr class="border-b border-gray-300">
                        <td class="border-r border-black p-1 text-center">${index + 1}</td>
                        <td class="border-r border-black p-1 text-center">${row.date.split('-').reverse().join('-')}</td>
                        <td class="border-r border-black p-1 text-center text-red-500 font-bold">${row.status}</td>
                        <td class="border-r border-black p-1 text-right">${row.qty > 0 ? row.qty.toFixed(3) : '-'}</td>
                        <td class="border-r border-black p-1 text-right">${row.qty > 0 ? '₹ ' + row.rate.toFixed(2) : '-'}</td>
                        <td class="p-1 text-right">${row.qty > 0 ? '₹ ' + row.amount.toFixed(2) : '-'}</td>
                    </tr>
                    `).join('')}
                    ${calc.details.length === 0 ? '<tr><td colspan="6" class="p-4 text-center text-gray-500">No entries for this period</td></tr>' : ''}
                </tbody>
                <tfoot>
                    <tr class="border-t-2 border-black font-bold bg-appbg dark:bg-gray-900">
                        <td colspan="3" class="border-r border-black p-2 text-right uppercase">Total</td>
                        <td class="border-r border-black p-2 text-right">${calc.totalQty.toFixed(3)}</td>
                        <td class="border-r border-black p-2 text-right">₹ ${(calc.totalQty > 0 ? calc.grossAmount / calc.totalQty : 0).toFixed(2)}</td>
                        <td class="p-2 text-right">₹ ${calc.grossAmount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <!-- Footer Calculations -->
            <div class="border-t-2 border-black grid grid-cols-2 text-sm font-bold mt-2">
                <div class="border-r-2 border-black">
                    <div class="flex justify-between p-2 border-b border-black">
                        <span>Commission (T x ${state.settings.commissionAmount}%) :</span>
                        <span>₹ ${calc.commission.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between p-2">
                        <span>Luggage (Kgs x ${state.settings.luggageAmount}) :</span>
                        <span>₹ ${calc.luggage.toFixed(2)}</span>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between p-2 border-b border-black">
                        <span>Total Commission :</span>
                        <span>₹ ${(calc.commission + calc.luggage).toFixed(2)}</span>
                    </div>
                    ${calc.advance > 0 ? `
                    <div class="flex justify-between p-2 text-red-600 border-b border-black bg-red-50 dark:bg-red-900/20">
                        <span>PREV. ADVANCE DEDUCTION :</span>
                        <span>- ₹ ${calc.advance.toFixed(2)}</span>
                    </div>` : ''}
                    <div class="flex justify-between p-2 text-lg">
                        <span>NET PAYABLE :</span>
                        <span>₹ ${calc.netPayable.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Signatures -->
            <div class="grid grid-cols-3 text-center text-xs font-bold mt-8 p-4 pt-12">
                <div>ROUTE SUPERVISOR</div>
                <div>MANAGER</div>
                <div>RECEIVED BY</div>
            </div>
        </div>
    `;

    if (action === 'view') {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in';
        modal.onclick = (e) => {
            if (e.target === modal) document.body.removeChild(modal);
        };

        const content = document.createElement('div');
        content.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors z-10';
        closeBtn.innerHTML = '<i data-lucide="x" class="h-5 w-5 text-gray-600 dark:text-gray-300"></i>';
        closeBtn.onclick = () => document.body.removeChild(modal);

        const billContainer = document.createElement('div');
        billContainer.innerHTML = billHtmlContent;
        // Adjust bill container styles for modal view
        const billDiv = billContainer.firstElementChild;
        billDiv.style.margin = '0';
        billDiv.style.maxWidth = 'none';
        billDiv.classList.remove('max-w-3xl');

        content.appendChild(closeBtn);
        content.appendChild(billContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);
        lucide.createIcons();

    } else if (action === 'download') {
        const billEl = document.createElement('div');
        billEl.className = 'bill-preview bg-white dark:bg-gray-800 p-8 max-w-3xl mx-auto text-black';
        billEl.innerHTML = billHtmlContent;

        const printArea = document.getElementById('printable-area');
        printArea.innerHTML = '';
        printArea.appendChild(billEl);

        try {
            await document.fonts.ready;

            // Capture as Canvas
            const canvas = await html2canvas(billEl, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Generate PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            // Save PDF
            const filename = `Invoice_${member.name.replace(/\s+/g, '_')}_${startDate.replace(/\//g, '-')}.pdf`;
            pdf.save(filename);

        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Failed to generate PDF. Check console for details.");
        } finally {
            printArea.innerHTML = '';
        }
    } else if (action === 'print') {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Bill - ${member.name}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
                ${billHtmlContent}
            </body>
            </html>
        `);
        printWindow.document.close();
    } else if (action === 'whatsapp') {
        if (!member.mobile) {
            alert('Please add a mobile number for this member first to send WhatsApp messages.');
            return;
        }

        const safeMobile = member.mobile.replace(/\\D/g, '');
        // If length is 10, prepend Indian area code 91
        const formattedMobile = safeMobile.length === 10 ? '91' + safeMobile : safeMobile;

        const msgText = `Hello *${member.name}*,
Your flower bill for the period *${startDate} to ${endDate}* is ready.
        
*Total Weight:* ${calc.totalQty.toFixed(3)} Kg
*Gross Amount:* ₹ ${calc.grossAmount.toFixed(2)}
${calc.advance > 0 ? `*Advance Deduction:* -₹ ${calc.advance.toFixed(2)}\\n` : ''}*Net Payable:* ₹ ${calc.netPayable.toFixed(2)}
        
Thank you,
*${shopName}*`;

        const url = `https://wa.me/${formattedMobile}?text=${encodeURIComponent(msgText)}`;
        window.open(url, '_blank');
        logActivity('WhatsApp Shared', `Bill sent to ${member.name} (${formattedMobile})`);
    }
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('reset-data-btn').addEventListener('click', resetData);

    // Initialize icons
    lucide.createIcons();

    // Initial Render
    checkAuth();
});
