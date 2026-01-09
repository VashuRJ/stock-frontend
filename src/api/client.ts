import axios from 'axios'

// Use /api prefix for proxy in development, direct URL in production
const baseURL = import.meta.env.MODE === 'development' 
  ? '/api' 
  : import.meta.env.VITE_API_BASE

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

// =====================================================
// Period Comparison API
// =====================================================
export interface PeriodInput {
  start_date: string  // YYYY-MM-DD
  end_date: string    // YYYY-MM-DD
}

export interface PeriodDataPoint {
  day: number
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  change_pct: number | null
}

export interface PeriodSummary {
  label: string
  start_date: string
  end_date: string
  total_days: number
  start_price: number
  end_price: number
  period_return_pct: number
  avg_price: number
  min_price: number
  max_price: number
  avg_volume: number
  total_volume: number
}

export interface PeriodData {
  label: string
  summary: PeriodSummary
  data: PeriodDataPoint[]
}

export interface ComparisonMetrics {
  return_difference: number
  period1_better: boolean
  avg_price_change: number
  volume_change_pct: number
  volatility_comparison: {
    period1_range: number
    period2_range: number
    period1_range_pct: number
    period2_range_pct: number
  }
}

export interface PeriodCompareResponse {
  symbol: string
  period1: PeriodData
  period2: PeriodData | null
  comparison: ComparisonMetrics | null
}

export type ComparePreset = 
  | 'previous_month' 
  | 'same_month_last_year' 
  | 'previous_week' 
  | 'previous_quarter' 
  | 'custom'

export interface PeriodCompareRequest {
  symbol: string
  period1: PeriodInput
  period2?: PeriodInput
  preset?: ComparePreset
  normalize?: boolean
}

// Fetch period comparison data
export const comparePeriods = async (request: PeriodCompareRequest): Promise<PeriodCompareResponse> => {
  const response = await api.post('/compare/periods', request)
  return response.data
}

// Get available presets
export const getComparePresets = async () => {
  const response = await api.get('/compare/periods/presets')
  return response.data.presets
}
