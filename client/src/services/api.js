const BASE_URL = '/api';

export function getAuthToken() {
  return localStorage.getItem('sdnp3_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('sdnp3_token', token);
  } else {
    localStorage.removeItem('sdnp3_token');
  }
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('sdnp3_user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('sdnp3_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('sdnp3_user');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    setAuthToken(null);
    setCurrentUser(null);
    window.location.hash = '#/login';
    throw new Error('Sesi kedaluwarsa. Silakan login kembali.');
  }

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Terjadi kesalahan sistem');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

