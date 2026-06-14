document.addEventListener('DOMContentLoaded', () => {
  // If a user is already saved, pre-fill the matching field for convenience
  const existing = getUser();
  if (existing) {
    if (existing.role === 'buyer') {
      document.getElementById('buyerName').value = existing.name;
    } else if (existing.role === 'seller') {
      document.getElementById('sellerName').value = existing.name;
    }
  }

  document.getElementById('goBuyer').addEventListener('click', () => enter('buyer', 'buyerName', 'buyer.html'));
  document.getElementById('goSeller').addEventListener('click', () => enter('seller', 'sellerName', 'seller.html'));

  // Allow pressing Enter inside the name field
  document.getElementById('buyerName').addEventListener('keydown', e => {
    if (e.key === 'Enter') enter('buyer', 'buyerName', 'buyer.html');
  });
  document.getElementById('sellerName').addEventListener('keydown', e => {
    if (e.key === 'Enter') enter('seller', 'sellerName', 'seller.html');
  });
});

function enter(role, inputId, destination) {
  const input = document.getElementById(inputId);
  const name = input.value.trim();
  if (!name) {
    input.focus();
    input.style.borderColor = 'var(--clay)';
    showToast('Please enter your name to continue');
    return;
  }
  setUser({ name, role });
  window.location.href = destination;
}
