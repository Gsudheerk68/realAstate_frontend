// js/landing.js: role choice, then login / sign up for the chosen role.
(function () {
  // ---------- Configure for your project ----------
  const API_BASE = 'https://realastate-backend.onrender.com';        // use your Render backend URL in production
  const ENDPOINTS = {
    login: '/api/auth/login',
    register: '/api/auth/register',
  };
  // Where each role goes after login. Match the pages in your repo.
  const ROLE_PAGES = { buyer: 'buyer.html', seller: 'seller.html', admin: 'admin.html' };
  // Use the same localStorage keys the rest of your app already reads.
  const STORAGE = { token: 'token', user: 'user' };
  // -------------------------------------------------

  const ROLES = {
    buyer: {
      title: 'Buyer account',
      headline: 'Find a plot that fits.',
      sub: 'Search listings by location and contact sellers directly.',
      phoneRequired: false,
    },
    seller: {
      title: 'Seller account',
      headline: 'Put your property in front of buyers.',
      sub: 'List properties, manage enquiries and respond in real time.',
      phoneRequired: true,
    },
  };

  const $ = (id) => document.getElementById(id);
  const stepRole = $('stepRole'), stepForm = $('stepForm');
  const loginForm = $('loginForm'), signupForm = $('signupForm');
  const tabLogin = $('tabLogin'), tabSignup = $('tabSignup');
  const message = $('formMessage');
  let role = null;

  // Already logged in? Skip straight to the right page.
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.user) || 'null');
    if (localStorage.getItem(STORAGE.token) && saved && ROLE_PAGES[saved.role]) {
      window.location.replace(ROLE_PAGES[saved.role]);
      return;
    }
  } catch (_) { /* ignore bad stored data */ }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message ' + type;
    message.hidden = false;
  }
  function clearMessage() { message.hidden = true; message.textContent = ''; }

  function chooseRole(next) {
    role = next;
    const cfg = ROLES[role];
    document.body.dataset.role = role;
    $('formTitle').textContent = cfg.title;
    $('mapHeadline').textContent = cfg.headline;
    $('mapSub').textContent = cfg.sub;
    $('phoneHint').textContent = cfg.phoneRequired ? '(required)' : '(optional)';
    $('signupPhone').required = cfg.phoneRequired;
    stepRole.hidden = true;
    stepForm.hidden = false;
    history.replaceState(null, '', '#' + role);
    setMode('login');
    $('loginEmail').focus();
  }

  function resetRole() {
    role = null;
    document.body.dataset.role = '';
    $('mapHeadline').textContent = 'Property, mapped out clearly.';
    $('mapSub').textContent = 'Buy, sell and connect with mediators in one place.';
    stepForm.hidden = true;
    stepRole.hidden = false;
    history.replaceState(null, '', location.pathname);
  }

  function setMode(mode) {
    const login = mode === 'login';
    loginForm.hidden = !login;
    signupForm.hidden = login;
    tabLogin.setAttribute('aria-selected', String(login));
    tabSignup.setAttribute('aria-selected', String(!login));
    clearMessage();
  }

  async function post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let data = {};
    try { data = await res.json(); } catch (_) { /* non-JSON response */ }
    return { ok: res.ok, data };
  }

  function validate(form) {
    let valid = true;
    form.querySelectorAll('input').forEach((input) => {
      const bad = !input.checkValidity();
      input.setAttribute('aria-invalid', String(bad));
      if (bad) valid = false;
    });
    if (!valid) showMessage('Please fill in all required fields correctly.', 'error');
    return valid;
  }

  function finishLogin(data) {
    const user = data.user || {};
    if (user.role && user.role !== role) {
      showMessage(`This is a ${user.role} account. Go back and choose "${user.role}" to log in.`, 'error');
      return;
    }
    localStorage.setItem(STORAGE.token, data.token);
    localStorage.setItem(STORAGE.user, JSON.stringify(user.role ? user : { ...user, role }));
    window.location.href = ROLE_PAGES[role];
  }

  async function onLogin(e) {
    e.preventDefault();
    clearMessage();
    if (!validate(loginForm)) return;
    const btn = $('loginSubmit');
    btn.disabled = true;
    try {
      const { ok, data } = await post(ENDPOINTS.login, {
        email: $('loginEmail').value.trim(),
        password: $('loginPassword').value,
        role,
      });
      if (!ok || !data.token) {
        showMessage(data.message || data.error || 'Email or password is incorrect.', 'error');
      } else {
        finishLogin(data);
      }
    } catch (_) {
      showMessage('Could not reach the server. Check your connection and try again.', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function onSignup(e) {
    e.preventDefault();
    clearMessage();
    if (!validate(signupForm)) return;
    const btn = $('signupSubmit');
    btn.disabled = true;
    try {
      const { ok, data } = await post(ENDPOINTS.register, {
        name: $('signupName').value.trim(),
        email: $('signupEmail').value.trim(),
        phone: $('signupPhone').value.trim(),
        password: $('signupPassword').value,
        role,
      });
      if (!ok) {
        showMessage(data.message || data.error || 'Could not create the account. Try a different email.', 'error');
      } else if (data.token) {
        finishLogin(data);
      } else {
        $('loginEmail').value = $('signupEmail').value.trim();
        setMode('login');
        showMessage('Account created. Log in to continue.', 'ok');
        $('loginPassword').focus();
      }
    } catch (_) {
      showMessage('Could not reach the server. Check your connection and try again.', 'error');
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- Wire up events ----------
  document.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => chooseRole(b.dataset.pick)));
  $('backBtn').addEventListener('click', resetRole);
  tabLogin.addEventListener('click', () => setMode('login'));
  tabSignup.addEventListener('click', () => setMode('signup'));
  document.querySelectorAll('[data-switch]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.switch)));
  document.querySelectorAll('.pw-toggle').forEach((b) =>
    b.addEventListener('click', () => {
      const input = $(b.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.textContent = show ? 'Hide' : 'Show';
    })
  );
  loginForm.addEventListener('submit', onLogin);
  signupForm.addEventListener('submit', onSignup);

  // Deep link: index.html#buyer or index.html#seller
  const fromHash = location.hash.replace('#', '');
  if (ROLES[fromHash]) chooseRole(fromHash);
})();
