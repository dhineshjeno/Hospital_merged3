import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token + hospital ID header to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const hospitalId = localStorage.getItem('hospitalId')
    || import.meta.env.VITE_HOSPITAL_ID;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (hospitalId) {
    config.headers['x-hospital-id'] = hospitalId;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('hospitalId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;