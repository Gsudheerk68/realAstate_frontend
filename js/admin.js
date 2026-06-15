// ============================================================
// PlotLine — Admin Console
// ============================================================

const usersState = { page: 1, search: '', role: '', status: '' };
const listingsState = { page: 1, search: '', status: '', type: '' };
const activityState = { page: 1, action: '', role: '' };

const ACTION_LABELS = {
  login: 'Login',
  logout: 'Logout',
  view_listing: 'Viewed listing',
  save_favorite: 'Saved favorite',
  unsave_favorite: 'Removed favorite',
  post_listing: 'Posted listing',
  edit_listing: 'Edited listing',
  delete_listing: 'Deleted listing',
  mark_sold: 'Marked sold',
  contact_seller: 'Contacted seller'
};

document.addEventListener('DOMContentLoaded', async () => {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('userName').textContent = user.name;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  setupTabs();
  setupFilters();

  await loadOverview();
});

// ============================================================
// Tabs
// ============================================================

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));

  if (name === 'overview') loadOverview();
  if (name === 'users') loadUsers();
  if (name === 'listings') loadListings();
  if (name === 'activity') loadActivities();
}

// ============================================================
// Filter wiring
// ============================================================

function setupFilters() {
  document.getElementById('userFilterBtn')?.addEventListener('click', () => {
    usersState.page = 1;
    usersState.search = document.getElementById('userSearch')?.value.trim() || '';
    usersState.role = document.getElementById('userRoleFilter')?.value || '';
    usersState.status = document.getElementById('userStatusFilter')?.value || '';
    loadUsers();
  });

  document.getElementById('userSearch')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('userFilterBtn')?.click();
  });

  document.getElementById('listingFilterBtn')?.addEventListener('click', () => {
    listingsState.page = 1;
    listingsState.search = document.getElementById('listingSearch')?.value.trim() || '';
    listingsState.status = document.getElementById('listingStatusFilter')?.value || '';
    listingsState.type = document.getElementById('listingTypeFilter')?.value || '';
    loadListings();
  });

  document.getElementById('listingSearch')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('listingFilterBtn')?.click();
  });

  document.getElementById('activityFilterBtn')?.addEventListener('click', () => {
    activityState.page = 1;
    activityState.action = document.getElementById('activityActionFilter')?.value || '';
    activityState.role = document.getElementById('activityRoleFilter')?.value || '';
    loadActivities();
  });
}

// ============================================================
// Helpers
// ============================================================

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function roleBadge(role) {
  return `<span class="badge badge-${role}">${role}</span>`;
}

function renderPagination(containerId, state, pages, loadFn) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (pages <= 1) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-dir="-1" ${state.page <= 1 ? 'disabled' : ''}>&larr; Prev</button>
    <span>Page ${state.page} of ${pages}</span>
    <button class="btn btn-ghost btn-sm" data-dir="1" ${state.page >= pages ? 'disabled' : ''}>Next &rarr;</button>
  `;

  el.querySelector('[data-dir="-1"]')?.addEventListener('click', () => {
    if (state.page > 1) { state.page--; loadFn(); }
  });
  el.querySelector('[data-dir="1"]')?.addEventListener('click', () => {
    if (state.page < pages) { state.page++; loadFn(); }
  });
}

// ============================================================
// Overview
// ============================================================

async function loadOverview() {
  try {
    const stats = await adminAPI.getStats();
    renderOverviewStats(stats);
    renderRecentSignups(stats.recentSignups || []);
    renderRecentActivity(stats.recentActivities || []);
  } catch (err) {
    console.error('Load overview error:', err);
    showToast('Failed to load admin stats. Is the backend running?');
  }
}

function renderOverviewStats(stats) {
  const wrap = document.getElementById('overviewStats');
  if (!wrap) return;

  const cards = [
    { label: 'Total users', value: stats.users.total },
    { label: 'Online now', value: stats.users.onlineNow },
    { label: 'Buyers', value: stats.users.buyers },
    { label: 'Sellers', value: stats.users.sellers },
    { label: 'Blocked', value: stats.users.blocked },
    { label: 'New today', value: stats.users.newToday },
    { label: 'New this week', value: stats.users.newThisWeek },
    { label: 'Total listings', value: stats.listings.total },
    { label: 'Available', value: stats.listings.active },
    { label: 'Sold', value: stats.listings.sold },
    { label: 'New listings today', value: stats.listings.newToday },
    { label: 'Total views', value: stats.listings.totalViews },
    { label: 'Saved favorites', value: stats.favorites.total }
  ];

  wrap.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>
  `).join('');
}

function renderRecentSignups(signups) {
  const wrap = document.getElementById('recentSignups');
  if (!wrap) return;

  if (signups.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><h3>No users yet</h3><p>New signups will appear here.</p></div>`;
    return;
  }

  wrap.innerHTML = signups.map(u => `
    <div class="list-row">
      <div class="lr-main">
        <div class="lr-title">${escapeHTML(u.name)}</div>
        <div class="lr-sub">${escapeHTML(u.email)} ${roleBadge(u.role)}</div>
      </div>
      <div class="lr-time">${formatDate(u.createdAt)}</div>
    </div>
  `).join('');
}

function renderRecentActivity(activities) {
  const wrap = document.getElementById('recentActivity');
  if (!wrap) return;

  if (activities.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><h3>No activity yet</h3><p>User actions will show up here.</p></div>`;
    return;
  }

  wrap.innerHTML = activities.map(a => `
    <div class="list-row">
      <div class="lr-main">
        <div class="lr-title">${escapeHTML(a.userName || 'Unknown user')} — ${ACTION_LABELS[a.action] || a.action}</div>
        <div class="lr-sub">${escapeHTML(a.description || a.listingTitle || '')}</div>
      </div>
      <div class="lr-time">${timeAgo(a.timestamp)}</div>
    </div>
  `).join('');
}

// ============================================================
// Users
// ============================================================

async function loadUsers() {
  try {
    const params = { page: usersState.page, limit: 20 };
    if (usersState.search) params.search = usersState.search;
    if (usersState.role) params.role = usersState.role;
    if (usersState.status) params.status = usersState.status;

    const data = await adminAPI.getUsers(params);
    renderUsersTable(data.users);

    const countEl = document.getElementById('usersCount');
    if (countEl) countEl.textContent = `${data.total} user${data.total === 1 ? '' : 's'}`;

    renderPagination('usersPagination', usersState, data.pages, loadUsers);
  } catch (err) {
    console.error('Load users error:', err);
    showToast('Failed to load users.');
  }
}

function renderUsersTable(users) {
  const body = document.getElementById('usersTableBody');
  if (!body) return;

  if (!users || users.length === 0) {
    body.innerHTML = `<tr><td colspan="8">No users match these filters.</td></tr>`;
    return;
  }

  const currentUser = getUser();

  body.innerHTML = users.map(u => {
    const statusBadge = u.isActive === false
      ? `<span class="badge badge-blocked">Blocked</span>`
      : `<span class="badge badge-active">Active</span>`;

    const activityBadge = u.isOnline
      ? `<span class="badge badge-online"><span class="badge-dot"></span>Online</span>`
      : `<span class="badge badge-offline"><span class="badge-dot"></span>${timeAgo(u.lastActive)}</span>`;

    const countsText = u.role === 'buyer'
      ? `${u.favoriteCount} saved`
      : u.role === 'seller'
        ? `${u.listingCount} listings`
        : `${u.listingCount} listings · ${u.favoriteCount} saved`;

    const isSelf = currentUser && currentUser.id === u._id;

    return `
      <tr data-id="${u._id}">
        <td class="cell-title">${escapeHTML(u.name)}${isSelf ? ' <span class="badge badge-admin">You</span>' : ''}</td>
        <td>
          <div>${escapeHTML(u.email)}</div>
          <div class="cell-mono" style="color:var(--ink-soft);">${escapeHTML(u.phone || '')}</div>
        </td>
        <td>
          ${roleBadge(u.role)}
          ${isSelf ? '' : `
            <select class="role-select-sm" data-action="role">
              <option value="buyer" ${u.role === 'buyer' ? 'selected' : ''}>buyer</option>
              <option value="seller" ${u.role === 'seller' ? 'selected' : ''}>seller</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
            </select>
          `}
        </td>
        <td>${statusBadge}</td>
        <td>${activityBadge}</td>
        <td class="cell-mono">${formatDate(u.createdAt)}</td>
        <td class="cell-mono">${countsText}</td>
        <td class="cell-actions">
          ${isSelf ? '' : `
            <button class="btn btn-ghost btn-sm" data-action="toggle-status">${u.isActive === false ? 'Unblock' : 'Block'}</button>
            <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
          `}
        </td>
      </tr>
    `;
  }).join('');

  // Wire up actions
  body.querySelectorAll('tr').forEach(row => {
    const id = row.dataset.id;
    if (!id) return;

    row.querySelector('[data-action="toggle-status"]')?.addEventListener('click', (e) => {
      const wantBlock = e.target.textContent.trim() === 'Block';
      toggleUserStatus(id, !wantBlock);
    });

    row.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteUser(id));

    row.querySelector('[data-action="role"]')?.addEventListener('change', (e) => {
      changeUserRole(id, e.target.value);
    });
  });
}

async function toggleUserStatus(id, isActive) {
  try {
    await adminAPI.setUserStatus(id, isActive);
    showToast(isActive ? 'User unblocked' : 'User blocked');
    await loadUsers();
  } catch (err) {
    console.error('Toggle user status error:', err);
  }
}

async function changeUserRole(id, role) {
  try {
    await adminAPI.setUserRole(id, role);
    showToast(`Role updated to ${role}`);
    await loadUsers();
  } catch (err) {
    console.error('Change role error:', err);
    await loadUsers(); // reset the select back if it failed
  }
}

async function deleteUser(id) {
  if (!confirm('Delete this user and all their listings, favorites, and activity? This cannot be undone.')) return;

  try {
    await adminAPI.deleteUser(id);
    showToast('User deleted');
    await loadUsers();
  } catch (err) {
    console.error('Delete user error:', err);
  }
}

// ============================================================
// Listings
// ============================================================

async function loadListings() {
  try {
    const params = { page: listingsState.page, limit: 20 };
    if (listingsState.search) params.search = listingsState.search;
    if (listingsState.status) params.status = listingsState.status;
    if (listingsState.type) params.type = listingsState.type;

    const data = await adminAPI.getListings(params);
    renderListingsTable(data.listings);

    const countEl = document.getElementById('listingsCount');
    if (countEl) countEl.textContent = `${data.total} listing${data.total === 1 ? '' : 's'}`;

    renderPagination('listingsPagination', listingsState, data.pages, loadListings);
  } catch (err) {
    console.error('Load listings error:', err);
    showToast('Failed to load listings.');
  }
}

function renderListingsTable(listings) {
  const body = document.getElementById('listingsTableBody');
  if (!body) return;

  if (!listings || listings.length === 0) {
    body.innerHTML = `<tr><td colspan="10">No listings match these filters.</td></tr>`;
    return;
  }

  body.innerHTML = listings.map(l => `
    <tr data-id="${l._id}">
      <td class="cell-mono">${escapeHTML(l.id)}</td>
      <td class="cell-title">${escapeHTML(l.title)}</td>
      <td>${escapeHTML(l.type)}</td>
      <td class="cell-mono">${formatINR(l.price)}</td>
      <td>${escapeHTML(l.location)}</td>
      <td>
        <div>${escapeHTML(l.sellerName || '—')}</div>
        <div class="cell-mono" style="color:var(--ink-soft);">${escapeHTML(l.sellerEmail || '')}</div>
      </td>
      <td><span class="status-tag ${l.status === 'Sold' ? 'sold' : 'available'}">${l.status}</span></td>
      <td class="cell-mono">${l.views || 0}</td>
      <td class="cell-mono">${formatDate(l.postedDate)}</td>
      <td class="cell-actions">
        <button class="btn btn-ghost btn-sm" data-action="toggle-status">${l.status === 'Sold' ? 'Mark Available' : 'Mark Sold'}</button>
        <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
      </td>
    </tr>
  `).join('');

  body.querySelectorAll('tr').forEach(row => {
    const id = row.dataset.id;
    if (!id) return;

    row.querySelector('[data-action="toggle-status"]')?.addEventListener('click', () => toggleListingStatus(row, id));
    row.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteListing(id));
  });
}

async function toggleListingStatus(row, id) {
  const isSold = row.querySelector('.status-tag')?.classList.contains('sold');
  const newStatus = isSold ? 'Available' : 'Sold';

  try {
    await adminAPI.setListingStatus(id, newStatus);
    showToast(`Marked as ${newStatus}`);
    await loadListings();
  } catch (err) {
    console.error('Toggle listing status error:', err);
  }
}

async function deleteListing(id) {
  if (!confirm('Delete this listing permanently? This cannot be undone.')) return;

  try {
    await adminAPI.deleteListing(id);
    showToast('Listing deleted');
    await loadListings();
  } catch (err) {
    console.error('Delete listing error:', err);
  }
}

// ============================================================
// Activity log
// ============================================================

async function loadActivities() {
  try {
    const params = { page: activityState.page, limit: 30 };
    if (activityState.action) params.action = activityState.action;
    if (activityState.role) params.role = activityState.role;

    const data = await adminAPI.getActivities(params);
    renderActivityTable(data.activities);

    const countEl = document.getElementById('activityCount');
    if (countEl) countEl.textContent = `${data.total} event${data.total === 1 ? '' : 's'}`;

    renderPagination('activityPagination', activityState, data.pages, loadActivities);
  } catch (err) {
    console.error('Load activities error:', err);
    showToast('Failed to load activity log.');
  }
}

function renderActivityTable(activities) {
  const body = document.getElementById('activityTableBody');
  if (!body) return;

  if (!activities || activities.length === 0) {
    body.innerHTML = `<tr><td colspan="6">No activity matches these filters.</td></tr>`;
    return;
  }

  body.innerHTML = activities.map(a => `
    <tr>
      <td class="cell-mono">${formatDateTime(a.timestamp)}</td>
      <td>${escapeHTML(a.userName || '—')}</td>
      <td>${a.userRole ? roleBadge(a.userRole) : '—'}</td>
      <td><span class="badge">${ACTION_LABELS[a.action] || a.action}</span></td>
      <td>${escapeHTML(a.description || a.listingTitle || '')}</td>
      <td class="cell-mono">${escapeHTML(a.ipAddress || '—')}</td>
    </tr>
  `).join('');
}

// ============================================================
// Logout
// ============================================================

function handleLogout() {
  if (!confirm('Logout?')) return;
  authAPI.logout().catch(() => {});
  clearAuthToken();
  localStorage.removeItem('plotline_user');
  window.location.href = 'index.html';
}
