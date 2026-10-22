import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to inject JWT bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('atm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiration
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if trying to login
      if (!error.config.url.includes('/auth/login')) {
        localStorage.removeItem('atm_token');
        localStorage.removeItem('atm_user');
      }
    }
    const message = error.response?.data?.message || error.message || 'API Communication Error';
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
};

export const faceApi = {
  enroll: (images) => apiClient.post('/face/enroll', { images }),
  getStatus: () => apiClient.get('/face/enrollment-status'),
  reEnroll: (password, images) => apiClient.post('/face/re-enroll', { password, images }),
};

export const verificationApi = {
  startSession: () => apiClient.post('/verification/start'),
  submitFrame: (image, frames = []) => apiClient.post('/verification/submit', { image, frames }),
  getHistory: (limit = 20) => apiClient.get(`/verification/history?limit=${limit}`),
  getStatus: () => apiClient.get('/verification/status'),
};

export const hardwareApi = {
  getPorts: () => apiClient.get('/hardware/ports'),
  getStatus: () => apiClient.get('/hardware/status'),
  connect: (port, baudrate) => apiClient.post('/hardware/connect', { port, baudrate }),
  disconnect: () => apiClient.post('/hardware/disconnect'),
  test: () => apiClient.post('/hardware/test'),
  updateSettings: (port, baudrate) => apiClient.put('/hardware/settings', { port, baudrate }),
};

export const adminApi = {
  getStats: () => apiClient.get('/admin/dashboard-stats'),
  getUsers: () => apiClient.get('/admin/users'),
  getLogs: (outcome = null, limit = 100) => {
    const q = outcome ? `?outcome=${outcome}&limit=${limit}` : `?limit=${limit}`;
    return apiClient.get(`/admin/verification-logs${q}`);
  },
  toggleUserStatus: (userId) => apiClient.post(`/admin/user/${userId}/toggle-status`),
  updateThreshold: (threshold) => apiClient.put('/admin/threshold', { threshold }),
};

export const transactionApi = {
  getHistory: () => apiClient.get('/transactions/history'),
  simulate: (type, amount) => apiClient.post('/transactions/simulate', { type, amount }),
};

export default apiClient;
