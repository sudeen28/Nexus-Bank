import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token on 401
let isRefreshing = false;
let failedQueue: { resolve: (t: string) => void; reject: (e: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Typed API calls
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.patch('/users/profile', data),
  changePassword: (data: any) => api.post('/users/change-password', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/users/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const accountsApi = {
  getAll: () => api.get('/accounts'),
  getStats: () => api.get('/accounts/stats'),
  getById: (id: string) => api.get(`/accounts/${id}`),
};

export const transactionsApi = {
  getAll: (params?: any) => api.get('/transactions', { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  transfer: (data: any) => api.post('/transactions/transfer', data),
  deposit: (data: any) => api.post('/transactions/deposit', data),
  withdraw: (data: any) => api.post('/transactions/withdraw', data),
  createPaymentIntent: (amount: number) => api.post('/transactions/payment-intent', { amount }),
};

export const cardsApi = {
  getAll: () => api.get('/cards'),
  create: (accountId?: string) => api.post('/cards', { accountId }),
  freeze: (id: string) => api.post(`/cards/${id}/freeze`),
  unfreeze: (id: string) => api.post(`/cards/${id}/unfreeze`),
  cancel: (id: string) => api.post(`/cards/${id}/cancel`),
  updateLimit: (id: string, dailyLimit: number) => api.patch(`/cards/${id}/limit`, { dailyLimit }),
};

export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export const kycApi = {
  getStatus: () => api.get('/kyc/status'),
  submit: (data: FormData) => api.post('/kyc/submit', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserDetail: (id: string) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id: string, data: any) => api.patch(`/admin/users/${id}/status`, data),
  getTransactions: (params?: any) => api.get('/admin/transactions', { params }),
  getFlaggedTransactions: (params?: any) => api.get('/admin/transactions/flagged', { params }),
  resolveTransaction: (id: string, action: string) => api.post(`/admin/transactions/${id}/resolve`, { action }),
  reviewKyc: (id: string, data: any) => api.post(`/admin/kyc/${id}/review`, data),
};
