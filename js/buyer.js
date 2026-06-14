// ============================================================
// PlotLine — Buyer Dashboard (API version)
// ============================================================

let currentTab = 'all';
let allListings = [];
let userFavorites = [];
let isLoading = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Auth check (also handled by auth-guard.js)
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  const user = getUser();
  if (!user || user.role !== 'buyer') {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('userName').textContent = user.name;

  // Tab handlers
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      render();
    });
  });

  // Filter handlers
  ['searchInput', 'typeFilter', 'minPrice', 'maxPrice', 'sortSelect'].forEach(id => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.addEventListener('input', render);
      elem.addEventListener('change', render);
    }
  });

  const clearBtn = document.getElementById('clearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      document.getElementById('typeFilter').value = '';
      document.getElementById('minPrice').value = '';
      document.getElementById('maxPrice').value = '';
      document.getElementById('sortSelect').value = 'newest';
      render();
    });
  }

  // Modal handlers
  const modalClose = document.getElementById('modalClose');
  if (modalClose) modalClose.addEventListener('click', closeModal);

  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Load initial data
  await loadData();
});

async function loadData() {
  isLoading = true;
  const grid = document.getElementById('listingGrid');
  if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--ink-3)">Loading listings…</div>';

  try {
    allListings = await listingsAPI.getAll();

    const favList = await favoritesAPI.getAll();
    userFavorites = favList.map(f => f.listingId?._id || f.listingId);

    showToast(`Loaded ${allListings.length} listings`);
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('Failed to load listings. Is the backend running?');
  } finally {
    isLoading = false;
    render();
  }
}

function getFilteredListings() {
  const search = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const type = document.getElementById('typeFilter')?.value || '';
  const minPrice = parseFloat(document.getElementById('minPrice')?.value) || 0;
  const maxPrice = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
  const sort = document.getElementById('sortSelect')?.value || 'newest';

  let results = allListings.filter(l => {
    if (currentTab === 'favourites' && !userFavorites.includes(l._id)) return false;
    if (type && l.type !== type) return false;
    if (l.price < minPrice || l.price > maxPrice) return false;
    if (search) {
      const haystack = (l.title + ' ' + l.location + ' ' + l.description + ' ' + l.type).toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  switch (sort) {
    case 'price-low':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'area':
      results.sort((a, b) => normalizeArea(b) - normalizeArea(a));
      break;
    default:
      results.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  }

  return results;
}

function normalizeArea(listing) {
  const factors = { 'sq.ft': 1, 'sq.yd': 9, 'cents': 435.6, 'acres': 43560 };
  return (listing.area || 0) * (factors[listing.areaUnit] || 1);
}

function render() {
  const grid = document.getElementById('listingGrid');
  if (!grid) return;

  const listings = getFilteredListings();

  const favCount = document.getElementById('favCount');
  if (favCount) {
    favCount.textContent = userFavorites.length ? `(${userFavorites.length})` : '';
  }

  const resultsCount = document.getElementById('resultsCount');
  if (resultsCount) {
    resultsCount.textContent = `${listings.length} listing${listings.length === 1 ? '' : 's'}`;
  }

  if (listings.length === 0) {
    grid.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.gridColumn = '1 / -1';
    empty.innerHTML = currentTab === 'favourites'
      ? `<h3>No favourites yet</h3><p>Tap the heart on a listing to save it.</p>`
      : `<h3>No matching listings</h3><p>Try different filters.</p>`;
    grid.appendChild(empty);
    return;
  }

  grid.innerHTML = listings.map(l => cardTemplate(l, userFavorites.includes(l._id))).join('');

  // Card click handlers
  grid.querySelectorAll('.survey-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.fav-btn')) return;
      openModal(card.dataset.id);
    });
  });

  // Favorite button handlers
  grid.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.closest('.survey-card').dataset.id;
      toggleFavorite(id, btn);
    });
  });
}

async function toggleFavorite(listingId, btn) {
  try {
    if (userFavorites.includes(listingId)) {
      await favoritesAPI.remove(listingId);
      userFavorites = userFavorites.filter(id => id !== listingId);
      btn.classList.remove('active');
      btn.textContent = '♡';
      showToast('Removed from favourites');
    } else {
      await favoritesAPI.add(listingId);
      userFavorites.push(listingId);
      btn.classList.add('active');
      btn.textContent = '♥';
      showToast('Added to favourites');
    }
    if (currentTab === 'favourites') render();
  } catch (err) {
    console.error('Favorite error:', err);
  }
}

async function openModal(id) {
  try {
    const listing = await listingsAPI.getById(id);
    const isFav = userFavorites.includes(listing._id);

    const media = document.getElementById('modalMedia');
    if (media) {
      if (listing.images && listing.images.length) {
        media.innerHTML = listing.images.map(src => `<img src="${src}" alt="${escapeHTML(listing.title)}">`).join('');
      } else {
        media.innerHTML = `<span class="no-image">No photos</span>`;
      }
    }

    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="modal-id">${listing.id} · ${listing.type} · ${listing.status}</div>
        <h2>${escapeHTML(listing.title)}</h2>
        <div class="card-location">📍 ${escapeHTML(listing.location)}</div>
        <div class="modal-price">${formatINR(listing.price)}</div>

        <div class="detail-grid">
          <div class="item"><span>Area</span>${formatArea(listing.area, listing.areaUnit)}</div>
          <div class="item"><span>Facing</span>${escapeHTML(listing.facing || '—')}</div>
          <div class="item"><span>Status</span>${listing.status}</div>
          <div class="item"><span>Posted</span>${formatDate(listing.postedDate)}</div>
          <div class="item"><span>Listing ID</span>${listing.id}</div>
          <div class="item"><span>Views</span>${listing.views || 0}</div>
        </div>

        <p>${escapeHTML(listing.description || 'No description provided.')}</p>

        <div class="card-actions">
          <button class="btn btn-clay" style="flex:1" id="modalFavBtn">
            ${isFav ? '♥ Saved to favourites' : '♡ Save to favourites'}
          </button>
        </div>

        <div class="contact-card">
          <h4>Seller contact details</h4>
          <div class="contact-row"><span class="label">Posted by</span><span class="value">${escapeHTML(listing.sellerName)}</span></div>
          <div class="contact-row"><span class="label">Phone</span><span class="value">${escapeHTML(listing.sellerPhone || '—')}</span></div>
          <div class="contact-row"><span class="label">Email</span><span class="value">${escapeHTML(listing.sellerEmail || '—')}</span></div>
        </div>
      `;

      let modalFavState = isFav;
      const modalFavBtn = document.getElementById('modalFavBtn');
      if (modalFavBtn) {
        modalFavBtn.addEventListener('click', async () => {
          if (!modalFavState) {
            await favoritesAPI.add(listing._id);
            userFavorites.push(listing._id);
            modalFavState = true;
          } else {
            await favoritesAPI.remove(listing._id);
            userFavorites = userFavorites.filter(id => id !== listing._id);
            modalFavState = false;
          }
          modalFavBtn.textContent = modalFavState ? '♥ Saved to favourites' : '♡ Save to favourites';
          showToast(modalFavState ? 'Added to favourites' : 'Removed from favourites');
        });
      }
    }

    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('hidden');
  } catch (err) {
    console.error('Modal error:', err);
  }
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function cardTemplate(listing, isFav) {
  const img = (listing.images && listing.images[0])
    ? `<img src="${listing.images[0]}" alt="${escapeHTML(listing.title)}">`
    : `<span class="no-image">No photo</span>`;

  return `
    <article class="survey-card" data-id="${listing._id}">
      <div class="card-media">
        ${img}
        <span class="status-tag ${listing.status === 'Sold' ? 'sold' : 'available'}">${listing.status}</span>
        <span class="plot-stamp">${listing.id}</span>
      </div>
      <div class="card-body">
        <span class="card-type">${listing.type}</span>
        <h3 class="card-title">${escapeHTML(listing.title)}</h3>
        <div class="card-location">📍 ${escapeHTML(listing.location)}</div>
        <div class="card-meta-row">
          <span class="card-price">${formatINR(listing.price)}</span>
          <span class="card-area">${formatArea(listing.area, listing.areaUnit)}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm" style="flex:1">View details</button>
          <button class="fav-btn ${isFav ? 'active' : ''}">${isFav ? '♥' : '♡'}</button>
        </div>
      </div>
    </article>`;
}

function handleLogout() {
  if (!confirm('Logout?')) return;
  authAPI.logout().catch(() => {});
  clearAuthToken();
  localStorage.removeItem('plotline_user');
  window.location.href = 'index.html';
}
