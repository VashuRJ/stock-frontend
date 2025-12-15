import axios from 'axios'

// Use /api prefix for proxy in development, direct URL in production
const baseURL = import.meta.env.MODE === 'development' 
  ? '/api' 
  : import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export const api = axios.create({ baseURL, withCredentials: true })

api.interceptors.request.use(config => {
  // Read token from localStorage; support both keys
  const token = localStorage.getItem('token') || localStorage.getItem('access_token')
  if (token) {
    // Ensure headers object exists
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global 401 handler: redirect to login on unauthorized
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('access_token')
        // optionally clear user email
        // localStorage.removeItem('user_email')
      } catch {}
      // Navigate to login (soft): update location if on client
      if (typeof window !== 'undefined') {
        const current = window.location.pathname
        if (!current.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)
