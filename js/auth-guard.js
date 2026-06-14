// ============================================================
// Authentication Guard
// ============================================================
// Protects buyer.html and seller.html from unauthorized access

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  const user = getUser();
  if (!user) {
    clearAuthToken();
    window.location.href = 'index.html';
    return;
  }

  // Check role matches page
  const pageName = window.location.pathname.split('/').pop();
  if (pageName === 'buyer.html' && user.role !== 'buyer') {
    window.location.href = 'seller.html';
  } else if (pageName === 'seller.html' && user.role !== 'seller') {
    window.location.href = 'buyer.html';
  }
});
