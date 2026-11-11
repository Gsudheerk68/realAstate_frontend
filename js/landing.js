// js/landing.js: role choice, then login / sign up for the chosen role.
// Uses the helpers your app already has (authAPI, setAuthToken, setUser, isAuthenticated, getUser),
// so the login is stored exactly the way buyer.html, seller.html and admin.html expect it.
(function () {
  // Where each role lands after login (same rule as your old auth.js).
  function roleHome(role) {
    if (role === 'admin') return 'admin.html';
    if (role === 'buyer') return 'buyer.html';
    return 'seller.html';
  }

  const ROLES = {
    buyer: {
      title: 'Buyer account',
      headline: 'Find a plot that fits.',
      sub: 'Search listings by location and contact sellers directly.',
    },
    seller: {
      title: 'Seller account',
      headline: 'Put your property in front of buyers.',
      sub: 'List properties, manage enquiries and respond in real time.',
    },
  };

  const $ = (id) => document.getElementById(id);
  const stepRole = $('stepRole'), stepForm = $('stepForm');
  const loginForm = $('loginForm'), signupForm = $('signupForm');
  const tabLogin = $('tabLogin'), tabSignup = $('tabSignup');
  const message = $('formMessage');
  let role = null;

  // Returns the names of any helper functions that are not available on this page.
  function missingHelpers() {
    const missing = [];
    if (typeof authAPI === 'undefined') missing.push('authAPI');
    if (typeof setAuthToken !== 'function') missing.push('setAuthToken');
    return missing;
  }
  function helpersReady() {
    const missing = missingHelpers();
    if (missing.length) {
      showMessage('Missing from your scripts: ' + missing.join(', ') +
        '. Add the script tag that defines them to index.html, above landing.js.', 'error');
      console.error('PlotLine landing: missing helpers ->', missing.join(', '));
      return false;
    }
    return true;
  }

  // Already logged in? Go to the right dashboard (same check your old page used).
  try {
    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
      const user = typeof getUser === 'function' ? getUser() : null;
      if (user && user.role) {
        window.location.replace(roleHome(user.role));
        return;
      }
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

  function markInvalid(input, bad) {
    input.setAttribute('aria-invalid', String(bad));
    return !bad;
  }

  const EMAIL_RE = /^[\w.-]+@[\w.-]+\.\w+$/;

  function errorText(err, fallback) {
    return (err && err.message && err.message !== 'Failed to fetch') ? err.message : fallback;
  }

  // Your old code removes 'plotline_user' on logout, so that is the key your dashboards read.
  // If setUser() is not available on this page, store the user under that same key.
  function storeUser(user) {
    if (typeof setUser === 'function') {
      setUser(user);
    } else {
      localStorage.setItem('plotline_user', JSON.stringify(user));
    }
  }

  function saveLogin(response) {
    setAuthToken(response.token);
    storeUser({
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
    });
  }

  async function onLogin(e) {
    e.preventDefault();
    clearMessage();
    if (!helpersReady()) return;
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    const okEmail = markInvalid($('loginEmail'), !EMAIL_RE.test(email));
    const okPass = markInvalid($('loginPassword'), !password);
    if (!okEmail || !okPass) {
      showMessage('Enter a valid email and your password.', 'error');
      return;
    }

    const btn = $('loginSubmit');
    btn.disabled = true;
    try {
      const response = await authAPI.login(email, password);
      const actual = response.user && response.user.role;
      // Admins may log in from either screen; buyers and sellers must use their own.
      if (actual && actual !== role && actual !== 'admin') {
        showMessage(`This is a ${actual} account. Go back, choose "${actual}" and log in again.`, 'error');
        return;
      }
      saveLogin(response);
      showMessage('Logged in. Taking you to your dashboard…', 'ok');
      setTimeout(() => { window.location.href = roleHome(actual || role); }, 600);
    } catch (err) {
      console.error('Login error:', err);
      showMessage(errorText(err, 'Email or password is incorrect, or the server is not reachable.'), 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function onSignup(e) {
    e.preventDefault();
    clearMessage();
    if (!helpersReady()) return;
    const name = $('signupName').value.trim();
    const email = $('signupEmail').value.trim();
    const phone = $('signupPhone').value.trim();
    const password = $('signupPassword').value;

    const checks = [
      markInvalid($('signupName'), !name),
      markInvalid($('signupEmail'), !EMAIL_RE.test(email)),
      markInvalid($('signupPhone'), !/^\d{10}$/.test(phone.replace(/\D/g, ''))),
      markInvalid($('signupPassword'), password.length < 6),
    ];
    if (checks.includes(false)) {
      showMessage('Check your details: a valid email, a 10-digit phone number and a password of at least 6 characters.', 'error');
      return;
    }

    const btn = $('signupSubmit');
    btn.disabled = true;
    try {
      const response = await authAPI.signup(name, email, phone, password, role);
      saveLogin(response);
      showMessage('Account created. Taking you to your dashboard…', 'ok');
      setTimeout(() => { window.location.href = roleHome(role); }, 800);
    } catch (err) {
      console.error('Signup error:', err);
      showMessage(errorText(err, 'Could not create the account. Try a different email or try again.'), 'error');
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
