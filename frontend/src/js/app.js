// Configuration
const CONFIG = {
    API_BASE_URL: 'https://vtu-pro-api.onrender.com/api',
 // Change to your backend URL
    PAYSTACK_PUBLIC_KEY: 'pk_live_b5622bad3a685b2e2d781934f3f1e84146dae9fe'
};

// State
let currentUser = null;
let currentTab = 'airtime';
let selectedNetwork = null;
let selectedNetworkName = '';
let selectedAmount = null;
let transactions = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    updateAmountGrid('airtime');
});

// Auth Functions
function checkAuthStatus() {
    const token = localStorage.getItem('vtu_token');
    const user = localStorage.getItem('vtu_user');
    if (token && user) {
        currentUser = JSON.parse(user);
        updateUIForLoggedInUser();
        fetchUserData();
    }
}

function openAuthModal(mode) {
    const modal = document.getElementById('authModal');
    modal.classList.add('active');
    modal.dataset.mode = mode;
    
    if (mode === 'register') {
        document.getElementById('authTitle').textContent = 'Create Account';
        document.getElementById('nameField').classList.remove('hidden');
        document.getElementById('confirmPasswordField').classList.remove('hidden');
    } else {
        document.getElementById('authTitle').textContent = 'Welcome Back';
        document.getElementById('nameField').classList.add('hidden');
        document.getElementById('confirmPasswordField').classList.add('hidden');
    }
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function toggleAuthMode() {
    const currentMode = document.getElementById('authModal').dataset.mode;
    openAuthModal(currentMode === 'login' ? 'register' : 'login');
}

// Auth Form Handler
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('authModal').dataset.mode;
    
    try {
        if (mode === 'register') {
            await register();
        } else {
            await login();
        }
    } catch (error) {
        showToast('Error', error.message, 'error');
    }
});

async function register() {
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
    }
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    
    localStorage.setItem('vtu_token', data.token);
    localStorage.setItem('vtu_user', JSON.stringify(data.user));
    currentUser = data.user;
    
    closeAuthModal();
    updateUIForLoggedInUser();
    showToast('Success', 'Account created!');
    fetchUserData();
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    
    localStorage.setItem('vtu_token', data.token);
    localStorage.setItem('vtu_user', JSON.stringify(data.user));
    currentUser = data.user;
    
    closeAuthModal();
    updateUIForLoggedInUser();
    showToast('Success', 'Welcome back!');
    fetchUserData();
}

function logout() {
    localStorage.removeItem('vtu_token');
    localStorage.removeItem('vtu_user');
    currentUser = null;
    location.reload();
}

function updateUIForLoggedInUser() {
    document.getElementById('authButtons').classList.add('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    document.getElementById('userMenu').classList.add('flex');
    document.getElementById('navDashboard').classList.remove('hidden');
    document.getElementById('navHistory').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.fullName || currentUser.email;
}

async function fetchUserData() {
    const token = localStorage.getItem('vtu_token');
    
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
            currentUser = { ...currentUser, ...data };
            document.getElementById('userBalance').textContent = formatCurrency(data.balance || 0);
            document.getElementById('dashboardBalance').textContent = formatCurrency(data.balance || 0);
        }
        
        const transRes = await fetch(`${CONFIG.API_BASE_URL}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const transData = await transRes.json();
        
        if (transRes.ok) {
            transactions = transData.transactions || [];
            updateTransactionsUI();
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Navigation
function showSection(section) {
    document.getElementById('homeSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
    
    if (section === 'home') document.getElementById('homeSection').classList.remove('hidden');
    else if (section === 'dashboard') document.getElementById('dashboardSection').classList.remove('hidden');
    else if (section === 'history') document.getElementById('historySection').classList.remove('hidden');
    else if (section === 'services') {
        document.getElementById('homeSection').classList.remove('hidden');
        document.getElementById('rechargeCard').scrollIntoView({ behavior: 'smooth' });
    }
}

// Recharge Functions
function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tab-airtime').className = tab === 'airtime' 
        ? 'px-4 py-2 rounded-full bg-primary text-white text-sm font-medium'
        : 'px-4 py-2 rounded-full glass text-gray-400 text-sm font-medium';
    document.getElementById('tab-data').className = tab === 'data'
        ? 'px-4 py-2 rounded-full bg-primary text-white text-sm font-medium'
        : 'px-4 py-2 rounded-full glass text-gray-400 text-sm font-medium';
    updateAmountGrid(tab);
}

function updateAmountGrid(type) {
    const grid = document.getElementById('amountGrid');
    selectedAmount = null;
    
    const amounts = type === 'data' 
        ? [[100, '100MB'], [300, '300MB'], [500, '500MB'], [1000, '1GB'], [2000, '2GB'], [5000, '5GB']]
        : [[100, '₦100'], [200, '₦200'], [500, '₦500'], [1000, '₦1,000'], [2000, '₦2,000'], [5000, '₦5,000']];
    
    grid.innerHTML = amounts.map(([val, label]) => `
        <button onclick="selectAmount(${val})" class="amount-btn py-3 rounded-xl border border-white/10 text-sm font-medium">
            ${label}
        </button>
    `).join('');
}

function selectNetwork(network, name) {
    selectedNetwork = network;
    selectedNetworkName = name;
    document.querySelectorAll('.network-select').forEach(el => el.classList.remove('active'));
    document.getElementById(`net-${network}`).classList.add('active');
}

function selectAmount(amount) {
    selectedAmount = amount;
    document.getElementById('customAmount').value = '';
    document.querySelectorAll('.amount-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', btn === event.target);
    });
}

function clearAmountSelection() {
    selectedAmount = null;
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
}

function validatePhone() {
    const phone = document.getElementById('phoneNumber').value;
    const regex = /^(080|081|070|071|090|091)\d{8}$/;
    const status = document.getElementById('phoneStatus');
    
    if (regex.test(phone)) {
        status.classList.remove('hidden');
        return true;
    } else {
        status.classList.add('hidden');
        return false;
    }
}

// Payment Functions
function initiatePayment() {
    if (!currentUser) {
        openAuthModal('login');
        return;
    }
    
    const phone = document.getElementById('phoneNumber').value;
    const customAmount = document.getElementById('customAmount').value;
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!selectedNetwork) return showToast('Error', 'Select a network', 'error');
    if (!validatePhone()) return showToast('Error', 'Invalid phone number', 'error');
    if (!amount || amount < 50) return showToast('Error', 'Minimum amount is ₦50', 'error');
    
    pendingTransaction = { type: currentTab, network: selectedNetwork, phone, amount };
    
    document.getElementById('paymentAmount').textContent = formatCurrency(amount);
    document.getElementById('paymentRecipient').textContent = `${selectedNetworkName} - ${phone}`;
    document.getElementById('walletBalanceDisplay').textContent = formatCurrency(currentUser.balance || 0);
    
    const walletBtn = document.getElementById('walletPayBtn');
    if ((currentUser.balance || 0) < amount) {
        walletBtn.classList.add('opacity-50');
        walletBtn.onclick = () => showToast('Error', 'Insufficient balance', 'error');
    } else {
        walletBtn.classList.remove('opacity-50');
        walletBtn.onclick = payWithWallet;
    }
    
    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

function payWithPaystack() {
    if (!pendingTransaction) return;
    
    const handler = PaystackPop.setup({
        key: CONFIG.PAYSTACK_PUBLIC_KEY,
        email: currentUser.email,
        amount: pendingTransaction.amount * 100,
        currency: 'NGN',
        ref: 'VTU_' + Date.now(),
        callback: (response) => verifyPayment(response.reference, 'paystack'),
        onClose: () => showToast('Info', 'Payment cancelled', 'info')
    });
    
    handler.openIframe();
    closePaymentModal();
}

async function payWithWallet() {
    if (!pendingTransaction) return;
    if ((currentUser.balance || 0) < pendingTransaction.amount) {
        return showToast('Error', 'Insufficient balance', 'error');
    }
    
    closePaymentModal();
    const btn = document.getElementById('rechargeBtn');
    btn.innerHTML = '<div class="loading-spinner inline-block mr-2"></div>Processing...';
    
    try {
        const token = localStorage.getItem('vtu_token');
        const res = await fetch(`${CONFIG.API_BASE_URL}/transactions/wallet-pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(pendingTransaction)
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        
        currentUser.balance = data.newBalance;
        updateUIForLoggedInUser();
        transactions.unshift(data.transaction);
        updateTransactionsUI();
        
        showToast('Success', 'Transaction completed!');
        resetForm();
        
    } catch (error) {
        showToast('Error', error.message, 'error');
    } finally {
        btn.innerHTML = 'Proceed to Pay';
    }
}

async function verifyPayment(reference, method) {
    const btn = document.getElementById('rechargeBtn');
    btn.innerHTML = '<div class="loading-spinner inline-block mr-2"></div>Verifying...';
    
    try {
        const token = localStorage.getItem('vtu_token');
        const res = await fetch(`${CONFIG.API_BASE_URL}/transactions/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reference, method, transaction_details: pendingTransaction })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        
        currentUser.balance = data.newBalance;
        updateUIForLoggedInUser();
        transactions.unshift(data.transaction);
        updateTransactionsUI();
        
        showToast('Success', 'Payment successful!');
        resetForm();
        
    } catch (error) {
        showToast('Error', error.message, 'error');
    } finally {
        btn.innerHTML = 'Proceed to Pay';
    }
}

// Wallet Funding
function openFundWalletModal() {
    document.getElementById('fundWalletModal').classList.add('active');
}

function closeFundWalletModal() {
    document.getElementById('fundWalletModal').classList.remove('active');
}

function setFundAmount(amount) {
    document.getElementById('fundAmount').value = amount;
}

function fundWalletWithPaystack() {
    const amount = parseFloat(document.getElementById('fundAmount').value);
    if (!amount || amount < 100) {
        return showToast('Error', 'Minimum funding is ₦100', 'error');
    }
    
    const handler = PaystackPop.setup({
        key: CONFIG.PAYSTACK_PUBLIC_KEY,
        email: currentUser.email,
        amount: amount * 100,
        currency: 'NGN',
        ref: 'WALLET_' + Date.now(),
        callback: (response) => verifyWalletFunding(response.reference, amount),
        onClose: () => showToast('Info', 'Payment cancelled', 'info')
    });
    
    handler.openIframe();
    closeFundWalletModal();
}

async function verifyWalletFunding(reference, amount) {
    try {
        const token = localStorage.getItem('vtu_token');
        const res = await fetch(`${CONFIG.API_BASE_URL}/wallet/fund`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reference, amount })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        
        currentUser.balance = data.newBalance;
        updateUIForLoggedInUser();
        transactions.unshift(data.transaction);
        updateTransactionsUI();
        
        showToast('Success', `Wallet funded with ${formatCurrency(amount)}`);
        
    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

// UI Updates
function updateTransactionsUI() {
    const list = document.getElementById('recentTransactionsList');
    const recent = transactions.slice(0, 5);
    
    if (recent.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-center">No transactions yet</p>';
        return;
    }
    
    list.innerHTML = recent.map(t => `
        <div class="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
                <div class="font-medium capitalize">${t.type}</div>
                <div class="text-sm text-gray-500">${t.phone || 'Wallet Funding'}</div>
            </div>
            <div class="text-right">
                <div class="font-semibold">${formatCurrency(t.amount)}</div>
                <div class="text-xs ${t.status === 'success' ? 'text-green-400' : 'text-yellow-400'}">${t.status}</div>
            </div>
        </div>
    `).join('');
    
    // Update table
    const tbody = document.getElementById('transactionsTableBody');
    if (tbody) {
        tbody.innerHTML = transactions.map(t => `
            <tr class="border-b border-white/5">
                <td class="p-4 text-sm">${new Date(t.date).toLocaleDateString()}</td>
                <td class="p-4 capitalize">${t.type}</td>
                <td class="p-4 font-medium">${formatCurrency(t.amount)}</td>
                <td class="p-4 ${t.status === 'success' ? 'text-green-400' : 'text-yellow-400'}">${t.status}</td>
            </tr>
        `).join('');
    }
    
    // Update stats
    const thisMonth = new Date().getMonth();
    const monthly = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && t.status === 'success' && t.type !== 'wallet_funding';
    });
    
    const spent = monthly.reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('totalSpent').textContent = formatCurrency(spent);
}

// Utilities
function formatCurrency(amount) {
    return '₦' + parseFloat(amount).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMessage').textContent = message;
    
    const icon = document.getElementById('toastIcon');
    icon.className = type === 'error' ? 'fas fa-exclamation-circle text-red-500 text-xl' :
                     type === 'info' ? 'fas fa-info-circle text-blue-500 text-xl' :
                     'fas fa-check-circle text-green-500 text-xl';
    
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 4000);
}

function resetForm() {
    document.getElementById('phoneNumber').value = '';
    document.getElementById('customAmount').value = '';
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.network-select').forEach(net => net.classList.remove('active'));
    selectedNetwork = null;
    selectedAmount = null;
}

function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('hidden');
}

function scrollToRecharge() {
    document.getElementById('rechargeCard').scrollIntoView({ behavior: 'smooth' });
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('#userMenu')) {
        document.getElementById('userDropdown').classList.add('hidden');
    }
});
