// ============================================================
// PlotLine Data Helpers
// ============================================================

// User storage (local)
function getUser() {
  try {
    return JSON.parse(localStorage.getItem('plotline_user')) || null;
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('plotline_user', JSON.stringify(user));
}

// ============================================================
// Formatting Helpers
// ============================================================

function formatINR(amount) {
  amount = Number(amount) || 0;
  if (amount >= 10000000) {
    return '₹' + trimDecimal(amount / 10000000) + ' Cr';
  }
  if (amount >= 100000) {
    return '₹' + trimDecimal(amount / 100000) + ' L';
  }
  return '₹' + amount.toLocaleString('en-IN');
}

function trimDecimal(num) {
  return (Math.round(num * 100) / 100).toString();
}

function formatArea(area, unit) {
  return area + ' ' + unit;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// ============================================================
// Toast Notifications
// ============================================================

let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ============================================================
// File Handling
// ============================================================

function filesToBase64(fileList, maxFiles = 4) {
  const files = Array.from(fileList).slice(0, maxFiles);
  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

// ============================================================
// HTML Escaping
// ============================================================

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
