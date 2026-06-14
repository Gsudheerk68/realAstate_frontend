// ============================================================
// PlotLine — Seller Dashboard (API version)
// ============================================================

let currentImages = [];
let myListings = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Auth check (also handled by auth-guard.js)
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  const user = getUser();
  if (!user || user.role !== 'seller') {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('userName').textContent = user.name;

  // Form handlers
  const form = document.getElementById('listingForm');
  if (form) form.addEventListener('submit', handleSubmit);

  const cancelBtn = document.getElementById('cancelEdit');
  if (cancelBtn) cancelBtn.addEventListener('click', resetForm);

  const imageInput = document.getElementById('images');
  if (imageInput) imageInput.addEventListener('change', handleImageSelect);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Load data
  await loadMyListings();
});

async function handleImageSelect(e) {
  try {
    currentImages = await filesToBase64(e.target.files, 4);
    renderImagePreview();
  } catch (err) {
    showToast('Error reading images');
  }
}

function renderImagePreview() {
  const wrap = document.getElementById('imagePreview');
  if (wrap) {
    wrap.innerHTML = currentImages.map(src => `<img src="${src}" alt="Preview">`).join('');
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('title')?.value.trim();
  const type = document.getElementById('type')?.value;
  const price = parseFloat(document.getElementById('price')?.value);
  const location = document.getElementById('location')?.value.trim();
  const area = parseFloat(document.getElementById('area')?.value);
  const areaUnit = document.getElementById('areaUnit')?.value;
  const facing = document.getElementById('facing')?.value;
  const description = document.getElementById('description')?.value.trim();
  const sellerPhone = document.getElementById('sellerPhone')?.value.trim();
  const sellerEmail = document.getElementById('sellerEmail')?.value.trim();
  const editId = document.getElementById('editId')?.value;

  if (!title || !location || isNaN(price) || isNaN(area)) {
    showToast('Please fill all required fields');
    return;
  }

  try {
    const listingData = {
      title, type, price, location, area, areaUnit, facing, description,
      sellerPhone, sellerEmail,
      images: currentImages
    };

    if (editId) {
      await listingsAPI.update(editId, listingData);
      showToast('Listing updated successfully');
    } else {
      await listingsAPI.create(listingData);
      showToast('Listing published successfully');
    }

    resetForm();
    await loadMyListings();
  } catch (err) {
    console.error('Submit error:', err);
  }
}

function resetForm() {
  const form = document.getElementById('listingForm');
  if (form) form.reset();

  document.getElementById('editId').value = '';
  document.getElementById('areaUnit').value = 'sq.ft';
  currentImages = [];
  renderImagePreview();

  document.getElementById('formTitle').textContent = 'Post a new property';
  document.getElementById('formSub').textContent = 'Fill in the survey details below — your listing appears instantly for buyers.';
  document.getElementById('submitBtn').textContent = 'Publish listing';

  const cancelBtn = document.getElementById('cancelEdit');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

async function loadMyListings() {
  try {
    myListings = await listingsAPI.getMyListings();
    renderStats();
    renderManageList();
  } catch (err) {
    console.error('Load error:', err);
    showToast('Failed to load listings. Is the backend running?');
  }
}

function renderStats() {
  const total = myListings.length;
  const active = myListings.filter(l => l.status === 'Available').length;
  const sold = myListings.filter(l => l.status === 'Sold').length;
  const views = myListings.reduce((sum, l) => sum + (l.views || 0), 0);

  const statTotal = document.getElementById('statTotal');
  if (statTotal) statTotal.textContent = total;

  const statActive = document.getElementById('statActive');
  if (statActive) statActive.textContent = active;

  const statSold = document.getElementById('statSold');
  if (statSold) statSold.textContent = sold;

  const statViews = document.getElementById('statViews');
  if (statViews) statViews.textContent = views;
}

function renderManageList() {
  const list = document.getElementById('manageList');
  if (!list) return;

  if (myListings.length === 0) {
    list.innerHTML = `<div class="empty-state"><h3>No listings yet</h3><p>Post your first property using the form.</p></div>`;
    return;
  }

  const sorted = [...myListings].sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));

  list.innerHTML = sorted.map(l => `
    <div class="manage-row" data-id="${l._id}">
      <div class="manage-thumb">
        ${l.images && l.images[0] ? `<img src="${l.images[0]}" alt="">` : 'No photo'}
      </div>
      <div class="manage-info">
        <div class="mi-title">${escapeHTML(l.title)}</div>
        <div class="mi-meta">
          <span>${l.id}</span>
          <span>${l.type}</span>
          <span>${formatINR(l.price)}</span>
          <span>${formatArea(l.area, l.areaUnit)}</span>
          <span class="status-tag ${l.status === 'Sold' ? 'sold' : 'available'}">${l.status}</span>
          <span>${l.views || 0} views</span>
        </div>
      </div>
      <div class="manage-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit">Edit</button>
        <button class="btn btn-sage btn-sm" data-action="toggle">${l.status === 'Sold' ? 'Mark Available' : 'Mark Sold'}</button>
        <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
      </div>
    </div>
  `).join('');

  // Action handlers
  list.querySelectorAll('.manage-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-action="edit"]')?.addEventListener('click', () => editListing(id));
    row.querySelector('[data-action="toggle"]')?.addEventListener('click', () => toggleSold(id));
    row.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteListing(id));
  });
}

async function editListing(id) {
  const listing = myListings.find(l => l._id === id);
  if (!listing) return;

  document.getElementById('editId').value = listing._id;
  document.getElementById('title').value = listing.title;
  document.getElementById('type').value = listing.type;
  document.getElementById('price').value = listing.price;
  document.getElementById('location').value = listing.location;
  document.getElementById('area').value = listing.area;
  document.getElementById('areaUnit').value = listing.areaUnit;
  document.getElementById('facing').value = listing.facing || '';
  document.getElementById('description').value = listing.description || '';

  if (document.getElementById('sellerPhone')) {
    document.getElementById('sellerPhone').value = listing.sellerPhone || '';
  }
  if (document.getElementById('sellerEmail')) {
    document.getElementById('sellerEmail').value = listing.sellerEmail || '';
  }

  currentImages = listing.images || [];
  renderImagePreview();

  document.getElementById('formTitle').textContent = `Editing ${listing.id}`;
  document.getElementById('formSub').textContent = 'Update the details below.';
  document.getElementById('submitBtn').textContent = 'Save changes';

  const cancelBtn = document.getElementById('cancelEdit');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  document.getElementById('listingForm')?.scrollIntoView({ behavior: 'smooth' });
}

async function toggleSold(id) {
  const listing = myListings.find(l => l._id === id);
  if (!listing) return;

  const newStatus = listing.status === 'Sold' ? 'Available' : 'Sold';

  try {
    await listingsAPI.update(id, { status: newStatus });
    showToast(`Marked as ${newStatus}`);
    await loadMyListings();
  } catch (err) {
    console.error('Toggle error:', err);
  }
}

async function deleteListing(id) {
  if (!confirm('Delete this listing permanently?')) return;

  try {
    await listingsAPI.delete(id);
    showToast('Listing deleted');
    await loadMyListings();
  } catch (err) {
    console.error('Delete error:', err);
  }
}

function handleLogout() {
  if (!confirm('Logout?')) return;
  authAPI.logout().catch(() => {});
  clearAuthToken();
  localStorage.removeItem('plotline_user');
  window.location.href = 'index.html';
}
