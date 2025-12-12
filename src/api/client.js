import axios from 'axios';
// Use /api prefix for proxy in development, direct URL in production
const baseURL = import.meta.env.MODE === 'development'
    ? '/api'
    : import.meta.env.VITE_API_BASE || 'http://localhost:8000';
export const api = axios.create({ baseURL, withCredentials: true });
api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        // Ensure headers object exists
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
