import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('netcom_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto clear token on unauthorized
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('netcom_token');
        localStorage.removeItem('netcom_user');
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
};

export const analyticsApi = {
  getOverview: () => api.get('/analytics/overview'),
  getDailyRevenue: (year, month) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    return api.get('/analytics/daily-revenue', { params });
  },
  getAnomalies: (year, method = 'zscore', threshold = 2.5) => {
    const params = { method, threshold };
    if (year) params.year = year;
    return api.get('/analytics/anomalies', { params });
  },
  getUnshippedOrders: (params) => api.get('/analytics/unshipped-orders', { params }),
  updateOrderStatus: (orderId, newStatus) =>
    api.patch(`/analytics/orders/${orderId}/status`, { order_status: newStatus }),
};

export const crudApi = {
  getDatasets: () => api.get('/crud/datasets'),
  getSchema: (dataset) => api.get(`/crud/schema/${dataset}`),
  listRecords: (dataset, params) => api.get(`/crud/${dataset}`, { params }),
  getRecord: (dataset, id) => api.get(`/crud/${dataset}/${id}`),
  createRecord: (dataset, data) => api.post(`/crud/${dataset}`, data),
  updateRecord: (dataset, id, data) => api.put(`/crud/${dataset}/${id}`, data),
  deleteRecord: (dataset, id) => api.delete(`/crud/${dataset}/${id}`),
};

export default api;
