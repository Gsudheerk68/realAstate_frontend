// ============================================================
// PlotLine API Client
// ============================================================

const API_BASE = 'https://realastate-backend.onrender.com/api';

// ============================================================
// Token Management
// ============================================================

function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function clearAuthToken() {
  localStorage.removeItem('authToken');
}

function isAuthenticated() {
  return !!getAuthToken();
}

// ============================================================
// API Request Helper
// ============================================================

async function apiCall(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const token = getAuthToken();
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `API Error: ${response.status}`);
    }

    return result;
  } catch (err) {
    console.error('API Error:', err.message);
    showToast(err.message);
    throw err;
  }
}

// ============================================================
// Auth API
// ============================================================

const authAPI = {
  signup: (name, email, phone, password, role) =>
    apiCall('POST', '/auth/signup', { name, email, phone, password, role }),

  login: (email, password) =>
    apiCall('POST', '/auth/login', { email, password }),

  logout: () =>
    apiCall('POST', '/auth/logout')
};

// ============================================================
// Listings API
// ============================================================

const listingsAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return apiCall('GET', `/listings${query}`);
  },

  getById: (id) =>
    apiCall('GET', `/listings/${id}`),

  create: (listing) =>
    apiCall('POST', '/listings', listing),

  update: (id, listing) =>
    apiCall('PUT', `/listings/${id}`, listing),

  delete: (id) =>
    apiCall('DELETE', `/listings/${id}`),

  getMyListings: () =>
    apiCall('GET', '/listings/my/listings')
};

// ============================================================
// Favorites API
// ============================================================

const favoritesAPI = {
  getAll: () =>
    apiCall('GET', '/favorites'),

  add: (listingId) =>
    apiCall('POST', `/favorites/${listingId}`),

  remove: (listingId) =>
    apiCall('DELETE', `/favorites/${listingId}`)
};

// ============================================================
// Activities API
// ============================================================

const activitiesAPI = {
  getMyActivities: () =>
    apiCall('GET', '/activities/my'),

  getSellerStats: () =>
    apiCall('GET', '/activities/seller-stats')
};

// ============================================================
// Admin API
// ============================================================

const adminAPI = {
  getStats: () =>
    apiCall('GET', '/admin/stats'),

  getUsers: (filters = {}) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return apiCall('GET', `/admin/users${query}`);
  },

  setUserStatus: (id, isActive) =>
    apiCall('PUT', `/admin/users/${id}/status`, { isActive }),

  setUserRole: (id, role) =>
    apiCall('PUT', `/admin/users/${id}/role`, { role }),

  deleteUser: (id) =>
    apiCall('DELETE', `/admin/users/${id}`),

  getListings: (filters = {}) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return apiCall('GET', `/admin/listings${query}`);
  },

  setListingStatus: (id, status) =>
    apiCall('PUT', `/admin/listings/${id}/status`, { status }),

  deleteListing: (id) =>
    apiCall('DELETE', `/admin/listings/${id}`),

  getActivities: (filters = {}) => {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return apiCall('GET', `/admin/activities${query}`);
  }
};
