const API_BASE = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem('token') || '';

export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.errors = data.errors || [];
    error.data = data;
    throw error;
  }

  return data;
};

// Auth API Calls
export const registerUser = async (formData) => {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
};

export const loginUser = async (credentials) => {
  const result = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  if (result.data?.token) {
    setToken(result.data.token);
  }
  if (result.data?.user) {
    setUser(result.data.user);
  }

  return result;
};

export const getProfile = async () => {
  return apiFetch('/api/auth/me', {
    method: 'GET',
  });
};

// Vehicle API Calls
export const fetchVehicles = async () => {
  return apiFetch('/api/vehicles', {
    method: 'GET',
  });
};

export const createVehicle = async (vehicleData) => {
  return apiFetch('/api/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicleData),
  });
};
