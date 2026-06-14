// ============================================================
// PlotLine Authentication Handler
// ============================================================

let currentAuthTab = 'signup';

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  if (isAuthenticated()) {
    const user = getUser();
    if (user && user.role) {
      window.location.href = user.role === 'buyer' ? 'buyer.html' : 'seller.html';
      return;
    }
  }

  // Setup auth form handlers
  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');

  if (signupBtn) signupBtn.addEventListener('click', handleSignup);
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);

  // Tab switching
  const tabSignup = document.getElementById('tabSignup');
  const tabLogin = document.getElementById('tabLogin');

  if (tabSignup) tabSignup.addEventListener('click', () => switchAuthTab('signup'));
  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));

  // Enter key handlers
  const signupPassword = document.getElementById('signupPassword');
  const loginPassword = document.getElementById('loginPassword');

  if (signupPassword) {
    signupPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSignup();
    });
  }

  if (loginPassword) {
    loginPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  // Start with signup tab
  switchAuthTab('signup');
});

function switchAuthTab(tab) {
  currentAuthTab = tab;

  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (activeTab) activeTab.classList.add('active');

  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');

  if (signupForm) signupForm.style.display = tab === 'signup' ? 'grid' : 'none';
  if (loginForm) loginForm.style.display = tab === 'login' ? 'grid' : 'none';
}

async function handleSignup() {
  const name = document.getElementById('signupName')?.value.trim();
  const email = document.getElementById('signupEmail')?.value.trim();
  const phone = document.getElementById('signupPhone')?.value.trim();
  const password = document.getElementById('signupPassword')?.value;
  const role = document.getElementById('signupRole')?.value;

  if (!name || !email || !phone || !password || !role) {
    showToast('Please fill in all fields');
    return;
  }

  if (!/^[\w\.-]+@[\w\.-]+\.\w+$/.test(email)) {
    showToast('Please enter a valid email');
    return;
  }

  if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
    showToast('Please enter a valid 10-digit phone number');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters');
    return;
  }

  try {
    const response = await authAPI.signup(name, email, phone, password, role);

    setAuthToken(response.token);
    setUser({
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role
    });

    showToast('Account created successfully!');
    setTimeout(() => {
      window.location.href = role === 'buyer' ? 'buyer.html' : 'seller.html';
    }, 1500);
  } catch (err) {
    console.error('Signup error:', err);
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;

  if (!email || !password) {
    showToast('Please enter email and password');
    return;
  }

  if (!/^[\w\.-]+@[\w\.-]+\.\w+$/.test(email)) {
    showToast('Please enter a valid email');
    return;
  }

  try {
    const response = await authAPI.login(email, password);

    setAuthToken(response.token);
    setUser({
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role
    });

    showToast('Logged in successfully!');
    setTimeout(() => {
      window.location.href = response.user.role === 'buyer' ? 'buyer.html' : 'seller.html';
    }, 1500);
  } catch (err) {
    console.error('Login error:', err);
  }
}

function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;

  authAPI.logout().catch(err => console.error('Logout error:', err));

  clearAuthToken();
  localStorage.removeItem('plotline_user');

  window.location.href = 'index.html';
}
