import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, LineChart
} from 'recharts'
import LightweightCandle from '@/components/LightweightCandle'
import { 
  Search, Bell, User, Plus, Activity, TrendingUp, TrendingDown, LogOut, X, Check,
  ChevronRight, ChevronDown, Pencil, Trash2, CheckCircle2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import Navbar from '@/components/Navbar'
import WatchlistPanelComplete from '@/dashboardpanel/WatchlistPanelComplete'

// --- INTERFACES ---
interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  previousClose: number
  name?: string
  sector?: string
  industry?: string
  marketCap?: number
  exchange?: string
}

interface ChartPoint {
  time: string
  timestamp?: number
  price: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
  sma?: number  // Simple Moving Average
  ema?: number  // Exponential Moving Average
}

interface WatchlistItem {
  id: number
  email: string
  watchlist_name: string
  symbol: string[]
}



// Helper to format market cap in an Indian-friendly short form
const formatMarketCap = (value?: number) => {
  if (!value || value <= 0) return ''
  const trillion = 1e12
  const billion = 1e9
  const crore = 1e7
  if (value >= trillion) return `₹${(value / trillion).toFixed(1)}T`
  if (value >= billion) return `₹${(value / billion).toFixed(1)}B`
  return `₹${(value / crore).toFixed(1)} Cr`
}

const normalizeExchange = (raw?: string, symbol?: string) => {
  const upper = raw?.toUpperCase()
  if (upper === 'NSE' || upper === 'NSI') return 'NSE'
  if (upper === 'BSE' || upper === 'BOM') return 'BSE'
  if (!upper && symbol?.endsWith('.NS')) return 'NSE'
  return upper || 'NSE'
}

const cleanCompanyName = (name?: string) => {
  if (!name) return undefined
  const cleaned = name
    .replace(/\s+(LIMITED|Limited|limited|LTD|Ltd)\.?$/i, '')
    .replace(/,+$/, '')
    .trim()
  return cleaned || name
}

// Custom Candlestick Component - Professional TradingView Style
const Candlestick = (props: any) => {
  const { x, y, width, height, payload } = props
  
  if (!payload || !payload.open || !payload.high || !payload.low || !payload.close) {
    return <g /> // Return empty SVG group
  }
  
  const { open, high, low, close } = payload
  const isGreen = close >= open
  const color = isGreen ? '#26a69a' : '#ef5350'
  
  // Calculate Y positions (Recharts provides these automatically)
  const yScale = (value: number) => {
    const range = high - low || 1
    const normalized = (high - value) / range
    return y + normalized * height
  }
  
  const yHigh = yScale(high)
  const yLow = yScale(low)
  const yOpen = yScale(open)
  const yClose = yScale(close)
  
  const bodyTop = Math.min(yOpen, yClose)
  const bodyBottom = Math.max(yOpen, yClose)
  const bodyHeight = Math.max(Math.abs(bodyBottom - bodyTop), 1)
  
  // PROFESSIONAL SETTINGS - TradingView-like candles
  const wickWidth = Math.max(1, Math.min(2, width * 0.06))          // wick thickness relative to available width
  const bodyWidth = Math.max(2, width * 0.6)  // Body width (60% of slot)
  const centerX = x + width / 2
  
  return (
    <g>
      {/* Upper Wick (High to Body) */}
      <line
        x1={centerX}
        y1={yHigh}
        x2={centerX}
        y2={bodyTop}
        stroke={color}
        strokeWidth={wickWidth}
        strokeLinecap="round"
        opacity={0.95}
      />
      {/* Lower Wick (Body to Low) */}
      <line
        x1={centerX}
        y1={bodyBottom}
        x2={centerX}
        y2={yLow}
        stroke={color}
        strokeWidth={wickWidth}
        strokeLinecap="round"
        opacity={0.95}
      />
      {/* Candle Body - THICK & PROFESSIONAL */}
      <rect
        x={x + (width - bodyWidth) / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={Math.max(0.6, wickWidth * 0.6)}
        rx={1}  // Slightly rounded corners
      />
    </g>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  
  // --- STATE ---
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS')
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [chartType, setChartType] = useState<'line' | 'candle'>('candle')
  const [timeframe, setTimeframe] = useState('1D')
  const [showVolume, setShowVolume] = useState(false)
  const [showIndicators, setShowIndicators] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false) // NEW: Fullscreen mode
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSearch, setShowSearch] = useState(false)
  
  // Columns Data
  const [indices, setIndices] = useState<StockData[]>([])
  const [popularData, setPopularData] = useState<StockData[]>([])
  const [gainers, setGainers] = useState<StockData[]>([])
  const [losers, setLosers] = useState<StockData[]>([])
  
  // Toast Notification State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  
  // Dynamic lists loaded from backend
  const [allStockSymbols, setAllStockSymbols] = useState<string[]>([])
  const [indicesSymbols, setIndicesSymbols] = useState<string[]>([])
  const [indicesListNames, setIndicesListNames] = useState<string[]>([])
  const [selectedIndexForMovers, setSelectedIndexForMovers] = useState<string>('NIFTY50')
  const [loadingMovers, setLoadingMovers] = useState(false)

  // Watchlist modal state (for Popular Stocks add-to-watchlist)
  const [watchlistModalOpen, setWatchlistModalOpen] = useState(false)
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([])
  const [selectedWatchlistIds, setSelectedWatchlistIds] = useState<number[]>([])
  const [modalSymbol, setModalSymbol] = useState<string | null>(null)
  const [newWatchlistName, setNewWatchlistName] = useState('')
  const [loadingWatchlists, setLoadingWatchlists] = useState(false)
  const [savingWatchlist, setSavingWatchlist] = useState(false)

  // prevent background scroll when fullscreen chart is open
  React.useEffect(() => {
    if (isFullscreen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
    return
  }, [isFullscreen])

  // Global toast helper
  
  // Fallback for indices if backend not ready
  const INDICES_SYMBOLS = ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT']

  // Load indices list from backend (/indices/list). Falls back to INDICES_SYMBOLS on error.
  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await api.get('/indices/list')
        const data = Array.isArray(res.data) ? res.data : []
        if (mounted) setIndicesListNames(data)
        if (mounted && data.length > 0) {
          // Map friendly index names to ticker symbols expected by fetchStock
          const mapping: Record<string, string> = {
            'NIFTY50': '^NSEI',
            'NIFTY 50': '^NSEI',
            'NIFTY 50 (NSE)': '^NSEI',
            'NIFTY': '^NSEI',
            'SENSEX': '^BSESN',
            'BSE SENSEX': '^BSESN',
            'BANKNIFTY': '^NSEBANK',
            'BANK NIFTY': '^NSEBANK',
            'NIFTY IT': '^CNXIT',
            'NIFTYIT': '^CNXIT',
          }

          const mapped = data.map((item: string) => mapping[item] || item)
          setIndicesSymbols(mapped)
          return
        }
      } catch (err) {
        console.warn('Failed to load indices list from backend, using fallback', err)
      }

      if (mounted) setIndicesSymbols(INDICES_SYMBOLS)
    }

    load()
    return () => { mounted = false }
  }, [])

  const stockDescriptor = useMemo(() => {
    const parts: string[] = []
    const exch = stockData?.exchange || normalizeExchange(undefined, selectedSymbol)
    if (exch) parts.push(exch)
    if (stockData?.marketCap) parts.push(formatMarketCap(stockData.marketCap))
    if (stockData?.sector) parts.push(stockData.sector)
    return parts.join(' • ')
  }, [stockData, selectedSymbol])

  // --- HELPER FOR INDEX NAMES ---
  const getIndexName = (symbol: string) => {
    switch(symbol) {
        case '^NSEI': return 'NIFTY 50';
        case '^BSESN': return 'SENSEX';
        case '^NSEBANK': return 'BANK NIFTY';
        case '^CNXIT': return 'NIFTY IT';
        default: return symbol.replace('^', '');
    }
  }

  // --- BACKEND DATA LOADERS ---
  
  // Load all stocks for search autocomplete
  
  // Load indices list

  // Suggestion helper via backend search
  const fetchStockSuggestions = async (query: string, limit: number = 10): Promise<string[]> => {
    try {
      const res = await api.get('/stocks/search', { params: { q: query } })
      const data = Array.isArray(res.data) ? res.data : []
      return data.slice(0, limit).map((s: any) => s.symbol)
    } catch (err) {
      console.error('Failed to fetch stock suggestions:', err)
      return []
    }
  }

  // --- WATCHLIST HELPERS FOR MODAL ---
  const loadWatchlists = async () => {
    const email = localStorage.getItem('user_email')
    if (!email) {
      showToast('Please login to use watchlists', 'error')
      return
    }
    try {
      setLoadingWatchlists(true)
      const res = await api.get(`/watchlist/detail/${email}`)
      setWatchlists(res.data || [])
    } catch (err) {
      console.error('Failed to load watchlists:', err)
      showToast('Failed to load watchlists', 'error')
    } finally {
      setLoadingWatchlists(false)
    }
  }

  const toggleWatchlistSelection = (id: number) => {
    setSelectedWatchlistIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const openWatchlistModal = (symbol: string) => {
    setModalSymbol(symbol)
    setSelectedWatchlistIds([])
    setNewWatchlistName('')
    setWatchlistModalOpen(true)
    loadWatchlists()
  }

  const saveToWatchlists = async () => {
    const email = localStorage.getItem('user_email')
    if (!email) {
      showToast('Please login first', 'error')
      return
    }
    if (!modalSymbol) return

    try {
      setSavingWatchlist(true)

      // Add to selected existing watchlists
      for (const id of selectedWatchlistIds) {
        try {
          await api.post(`/watchlist/${id}/add-symbol/${modalSymbol}`)
        } catch (err: any) {
          const msg = err?.response?.data?.detail || 'Failed to add symbol'
          showToast(msg, 'error')
          return
        }
      }

      // Create new watchlist if name provided
      const trimmed = newWatchlistName.trim()
      if (trimmed) {
        await api.post('/watchlist/', {
          email,
          watchlist_name: trimmed,
          symbols: [modalSymbol],
        })
      }

      showToast(`${modalSymbol.replace('.NS','')} added to watchlist`, 'success')
      setWatchlistModalOpen(false)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Something went wrong'
      showToast(msg, 'error')
    } finally {
      setSavingWatchlist(false)
    }
  }

  // --- API HELPER FUNCTIONS ---

  // 1. Fetch Single Stock (REAL data from backend)
  const fetchStock = async (symbol: string) => {
    try {
      const res = await api.get(`/stocks/price/${symbol}`)
      const data = res.data
      const exchange = normalizeExchange(data.exchange, symbol)
      const name = cleanCompanyName(data.name || symbol)
      
      const price = data.price || 0
      const prevClose = data.previousClose || price
      const change = price - prevClose
      const changeP = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0

      return {
        symbol: symbol,
        price: price,
        change: change,
        changePercent: changeP,
        volume: data.volume || 0,
        high: data.high || price,
        low: data.low || price,
        previousClose: prevClose,
        name: name,
        sector: data.sector,
        industry: data.industry,
        marketCap: data.marketCap,
        exchange: exchange,
      } as StockData
    } catch (err) {
      console.error("Error fetching", symbol, err)
      return null
    }
  }

  // Build an index-level historical series by averaging constituents
  const fetchIndexHistorical = async (indexTicker: string, interval: string = '1D') => {
    try {
      setLoading(true)
      setError(null)

      // map ticker to backend index key
      const tickerToIndexKey: Record<string, string> = {
        '^NSEI': 'NIFTY50',
        '^BSESN': 'SENSEX',
        '^NSEBANK': 'BANKNIFTY',
        '^CNXIT': 'NIFTYIT'
      }
      const indexKey = tickerToIndexKey[indexTicker] || indexTicker.replace(/^\^/, '')

      // fetch index members from backend
      const membersRes = await api.get(`/indices/${encodeURIComponent(indexKey)}`)
      const items = Array.isArray(membersRes.data) ? membersRes.data : []
      const symbols: string[] = items.map((it: any) => it.stock_symbol || it.stockSymbol || it.symbol).filter(Boolean)

      if (symbols.length === 0) return []

      // limit number of members to avoid too many requests (configurable)
      const maxMembers = 30
      const selectedSymbols = symbols.slice(0, maxMembers)

      // map timeframe -> days (reuse same mapping as historical fetch)
      const daysByInterval: Record<string, number> = {
        '1D': 0, '1W': 14, '1M': 30, '3M': 90, '6M': 180, '1Y': 365
      }
      const days = daysByInterval[interval] ?? 365

      // fetch historical for each member (in parallel)
      const resArr = await Promise.all(selectedSymbols.map(s =>
        api.get(`/stocks/historical/${s}`, { params: { days } }).then(r => ({ symbol: s, data: Array.isArray(r.data) ? r.data : [] })).catch(() => ({ symbol: s, data: [] }))
      ))

      // build date->values map for open/high/low/close arrays
      const dateMap: Record<string, { open: number[]; high: number[]; low: number[]; close: number[] }> = {}
      resArr.forEach(({ symbol, data }) => {
        data.forEach((row: any) => {
          const dateValue = row.date ?? row.timestamp ?? row.time
          const ts = dateValue ? new Date(dateValue).getTime() : null
          if (!ts) return
          const key = new Date(ts).toISOString().slice(0, 10)

          const o = row.open ?? row.O ?? row.Open ?? null
          const h = row.high ?? row.H ?? row.High ?? null
          const l = row.low ?? row.L ?? row.Low ?? null
          const c = row.close ?? row.close ?? row.price ?? row.Close ?? null

          // ensure numeric
          const on = o != null ? Number(o) : null
          const hn = h != null ? Number(h) : null
          const ln = l != null ? Number(l) : null
          const cn = c != null ? Number(c) : null

          if (cn == null) return
          if (!dateMap[key]) dateMap[key] = { open: [], high: [], low: [], close: [] }
          if (on != null) dateMap[key].open.push(on)
          if (hn != null) dateMap[key].high.push(hn)
          if (ln != null) dateMap[key].low.push(ln)
          dateMap[key].close.push(cn)
        })
      })

      // create sorted array of averaged points (ascending)
      const keys = Object.keys(dateMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      const points = keys.map(k => {
        const bucket = dateMap[k]
        const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / (arr.length || 1)
        const oAvg = bucket.open.length ? avg(bucket.open) : avg(bucket.close)
        const hAvg = bucket.high.length ? avg(bucket.high) : avg(bucket.close)
        const lAvg = bucket.low.length ? avg(bucket.low) : avg(bucket.close)
        const cAvg = avg(bucket.close)
        const ts = new Date(k).getTime()
        return {
          time: new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          timestamp: ts,
          price: cAvg,
          open: oAvg,
          high: hAvg,
          low: lAvg,
          close: cAvg,
          volume: 0,
        }
      })

      return points
    } catch (err) {
      console.error('Index historical error:', err)
      setError('Failed to build index historical data')
      return []
    } finally {
      setLoading(false)
    }
  }

  // --- TOP MOVERS (per-index) ---
  const loadTopMovers = async (indexName: string, topN: number = 5) => {
    try {
      setLoadingMovers(true)
      // indexName should match backend keys like 'NIFTY50' or 'BANKNIFTY'
      const res = await api.get(`/indices/${encodeURIComponent(indexName)}`)
      const items = Array.isArray(res.data) ? res.data : []
      const symbols: string[] = items.map((it: any) => it.stock_symbol || it.stockSymbol || it.symbol).filter(Boolean)

      // fetch prices for each symbol (careful: many requests)
      const results = await Promise.all(symbols.map((s: string) => fetchStock(s)))
      const stocks = results.filter(Boolean) as StockData[]

      // sort by percent change
      const sortedDesc = [...stocks].sort((a, b) => b.changePercent - a.changePercent)
      const sortedAsc = [...stocks].sort((a, b) => a.changePercent - b.changePercent)

      setGainers(sortedDesc.slice(0, topN))
      setLosers(sortedAsc.slice(0, topN))
    } catch (err) {
      console.error('Failed to load top movers for index', indexName, err)
      showToast('Failed to load movers', 'error')
    } finally {
      setLoadingMovers(false)
    }
  }

  // 2. Fetch Real Historical Data (ONLY from DB - No Fallback)
  const fetchHistoricalData = async (symbol: string, interval: string = '1D') => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`📈 Fetching real historical data for ${symbol} from database`)
      
      // For 1D, use intraday endpoint to show today's live candles
      if (interval === '1D') {
        try {
          const intradayRes = await api.get(`/stocks/intraday/${symbol}`)
          const iData = (intradayRes.data || []).map((item: any) => {
            const ts = new Date(item.date).getTime()
            const timeLabel = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            return {
              time: timeLabel,
              timestamp: ts,
              price: item.close,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume,
            }
          })
          if (iData.length) return iData
        } catch (e) {
          console.warn('Intraday fetch failed, falling back to daily', e)
        }
      }

      // Map UI timeframe to number of days the backend should return (for DAILY candles only)
      const daysByInterval: Record<string, number> = {
        '1D': 0,   // Special case: 0 means use intraday endpoint (handled above)
        '1W': 14,  // ~2 weeks of daily data
        '1M': 30,  // ~1 month of daily data
        '3M': 90,  // ~3 months of daily data
        '6M': 180, // ~6 months of daily data
        '1Y': 365, // 1 year of daily data
      }

      const days = daysByInterval[interval] ?? 365

      // Fetch from backend — returns REAL daily_data from DB
      const res = await api.get(`/stocks/historical/${symbol}`, {
        params: { days }
      })
      
      if (!res.data || res.data.length === 0) {
        throw new Error('No historical data available')
      }

      // Format real data from DB
      const formattedData = res.data.map((item: any) => {
        const dateValue = item.date || item.timestamp || item.time
        const ts = dateValue ? new Date(dateValue).getTime() : Date.now()
        const timeLabel = new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })

        return {
          time: timeLabel,
          timestamp: ts,
          price: item.close,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }
      })
      
      console.log(`✅ Got ${formattedData.length} REAL candles from database`)
      return formattedData
      
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err.message || 'No data'
      console.error('❌ Historical data error:', errMsg)
      setError(`📊 ${errMsg} — Database may not have data yet. Run: python -m service.historical_fetch`)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Fallback: Generate Realistic Chart Data
  const generateRealisticChart = (basePrice: number, interval: string): ChartPoint[] => {
    const data: ChartPoint[] = []
    let price = basePrice
    
    // Get IST time (Indian market time)
    const now = new Date()
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    
    // Determine points based on interval
    const intervalMap: { [key: string]: { points: number, days: number } } = {
      '1D': { points: 30, days: 1 },      // 30 days, daily candles
      '1W': { points: 52, days: 7 },      // 1 year, weekly candles
      '1M': { points: 12, days: 30 },     // 1 year, monthly candles
      '3M': { points: 12, days: 90 },     // 3 years, quarterly candles
      '6M': { points: 12, days: 180 },    // 6 years, bi-annual candles
      '1Y': { points: 10, days: 365 }     // 10 years, yearly candles
    }
    
    const config = intervalMap[interval] || { points: 30, days: 1 }
    
    // Calculate start time based on interval
    let startTime = new Date(istTime)
    startTime.setHours(15, 30, 0, 0) // Set to market close time
    
    // Go back by total days needed (points * days per candle)
    const totalDays = config.points * config.days
    startTime.setDate(startTime.getDate() - totalDays)
    
    let validPoints = 0
    let dayCounter = 0
    const maxIterations = config.points * 3 // Safety limit
    
    while (validPoints < config.points && dayCounter < maxIterations) {
      const time = new Date(startTime.getTime() + dayCounter * config.days * 86400000)
      dayCounter++
      
      // Skip weekends for all timeframes
      const day = time.getDay()
      if (day === 0 || day === 6) continue
      
      const open = price
      const volatility = basePrice * 0.008 // 0.8% volatility
      const change = (Math.random() - 0.5) * volatility
      const close = price + change
      const high = Math.max(open, close) + Math.random() * (volatility * 0.3)
      const low = Math.min(open, close) - Math.random() * (volatility * 0.3)
      const volume = Math.floor(Math.random() * 1000000) + 500000
      
      // Format time based on interval
      let timeLabel = ''
      if (interval === '1Y') {
        timeLabel = time.getFullYear().toString()
      } else if (interval === '6M' || interval === '3M') {
        timeLabel = time.toLocaleDateString([], { month: 'short', year: 'numeric' })
      } else {
        timeLabel = time.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
      
      data.push({
        time: timeLabel,
        timestamp: time.getTime(),
        price: close,
        open,
        high,
        low,
        close,
        volume
      })
      price = close
      validPoints++
    }
    
    // CRITICAL FIX: Ensure last candle matches current EXACT price
    const lastCandle = data[data.length - 1]
    lastCandle.close = basePrice
    lastCandle.price = basePrice
    // Adjust high/low to include current price
    lastCandle.high = Math.max(lastCandle.high || basePrice, basePrice)
    lastCandle.low = Math.min(lastCandle.low || basePrice, basePrice)
    
    console.log(`📊 Generated ${data.length} candles for ${interval}. Last candle time: ${lastCandle.time}`, {
      O: lastCandle.open?.toFixed(2),
      H: lastCandle.high?.toFixed(2),
      L: lastCandle.low?.toFixed(2),
      C: lastCandle.close?.toFixed(2)
    })
    
    return data
  }

  // --- TECHNICAL INDICATORS (Professional Implementation) ---
  
  // Calculate Simple Moving Average (SMA)
  const calculateSMA = (data: ChartPoint[], period: number = 20): ChartPoint[] => {
    return data.map((point, index) => {
      if (index < period - 1) {
        return { ...point, sma: undefined }
      }
      const sum = data.slice(index - period + 1, index + 1).reduce((acc, p) => acc + p.close!, 0)
      return { ...point, sma: sum / period }
    })
  }

  // Calculate Exponential Moving Average (EMA)
  const calculateEMA = (data: ChartPoint[], period: number = 20): ChartPoint[] => {
    const k = 2 / (period + 1)
    let ema = data[0].close!
    
    return data.map((point, index) => {
      if (index === 0) {
        return { ...point, ema }
      }
      ema = point.close! * k + ema * (1 - k)
      return { ...point, ema }
    })
  }

  // Memoize chart data with indicators for performance
  const chartDataWithIndicators = useMemo(() => {
    if (!showIndicators || chartData.length === 0) return chartData
    
    let processedData = [...chartData]
    processedData = calculateSMA(processedData, 20)
    processedData = calculateEMA(processedData, 12)
    
    return processedData
  }, [chartData, showIndicators])

  // --- EFFECTS ---

  // Auto-refresh cleanup ref
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null)

  // Check if market is open (NSE timing: 9:15 AM - 3:30 PM IST, Monday-Friday)
  const isMarketOpen = (): boolean => {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 6 = Saturday
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentTime = hours * 60 + minutes // Convert to minutes
    
    // Market closed on weekends
    if (day === 0 || day === 6) return false
    
    // Market timing: 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
    const marketStart = 9 * 60 + 15 // 9:15 AM
    const marketEnd = 15 * 60 + 30   // 3:30 PM
    
    return currentTime >= marketStart && currentTime <= marketEnd
  }

  // Load Main Chart with Timeframe Support
  useEffect(() => {
    const loadMainChart = async () => {
      console.log(`📊 Loading chart for: ${selectedSymbol}`)
      setLoading(true)
      setError(null)
      
      try {
        // Fetch current stock data FIRST
        const data = await fetchStock(selectedSymbol)
        if (data) {
          console.log(`✅ Stock data loaded for ${selectedSymbol}: ₹${data.price}`)
          setStockData(data)
          
          // NOW fetch REAL historical data from database
          let historicalData: ChartPoint[] = []
          if (selectedSymbol.startsWith('^')) {
            // selected symbol is an index ticker (e.g., ^NSEI) — build index series from constituents
            historicalData = await fetchIndexHistorical(selectedSymbol, timeframe)
          } else {
            historicalData = await fetchHistoricalData(selectedSymbol, timeframe)
          }

          // If backend/aggregation returned nothing, fall back to synthetic so UI still updates
          if (!historicalData || historicalData.length === 0) {
            const synthetic = generateRealisticChart(data.price, timeframe)
            console.log(`⚠️ No real data, using synthetic: ${synthetic.length} points`)
            setChartData(synthetic)
          } else {
            console.log(`✅ Chart data loaded: ${historicalData.length} points`)
            setChartData(historicalData)
          }
        } else {
          setError('Unable to fetch stock data')
        }
      } catch (err) {
        console.error('Chart loading error:', err)
        setError('Failed to load chart data')
      } finally {
        setLoading(false)
      }
    }

    // Initial load
    loadMainChart()
    
    // Cleanup previous interval
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current)
    }
    
    // Setup auto-refresh ONLY if market is open AND autoRefresh is true
    if (autoRefresh && isMarketOpen()) {
      console.log('🔄 Auto-refresh enabled - Market is OPEN')
      autoRefreshInterval.current = setInterval(loadMainChart, 5000)
    } else if (!isMarketOpen()) {
      console.log('⏸️ Auto-refresh disabled - Market is CLOSED')
      setError('Market is closed. Showing last available data.')
    }
    
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
      }
    }
  }, [selectedSymbol, autoRefresh, timeframe])

  // Load Indices
  useEffect(() => {
    const load = async () => {
      const symbolsToUse = indicesSymbols.length > 0 ? indicesSymbols : INDICES_SYMBOLS
      const results = await Promise.all(symbolsToUse.map((s: string) => fetchStock(s)))
      setIndices(results.filter(Boolean) as StockData[])
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [indicesSymbols])

  // Load Popular Stocks, Gainers & Losers on Mount
  useEffect(() => {
    const load = async () => {
      try {
        const popRes = await api.get('/stocks/popular', { params: { limit: 40 } })
        const popularSymbols = popRes.data.map((s: any) => s.symbol)
        const pResults = await Promise.all(popularSymbols.map((s: string) => fetchStock(s)))
        const popularStocks = pResults.filter(Boolean) as StockData[]
        setPopularData(popularStocks)
        
        // Calculate REAL Gainers & Losers
        const sorted = [...popularStocks].sort((a, b) => b.changePercent - a.changePercent)
        setGainers(sorted.slice(0, 3))
        setLosers(sorted.slice(-3).reverse())
      } catch (err) {
        console.error('Failed to load popular stocks:', err)
      }
    }
    load()
  }, [])

  // Load top movers for selected index when changed
  useEffect(() => {
    // ensure we have a selected index
    if (selectedIndexForMovers) {
      loadTopMovers(selectedIndexForMovers, 5)
    }
  }, [selectedIndexForMovers])

  // --- SEARCH HANDLERS (NEW) ---
  const handleSearch = async (value: string) => {
    setSearchQuery(value)
    if (value.length >= 1) {
      const matches = await fetchStockSuggestions(value, 8)
      setSearchSuggestions(matches)
    } else {
      setSearchSuggestions([])
    }
  }

  const selectSearchStock = (symbol: string) => {
    setSelectedSymbol(symbol)
    setSearchQuery('')
    setSearchSuggestions([])
    setShowSearch(false)
  }

  // --- ACTIONS ---
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }
  




  const getColor = (val: number) => val >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
  const getBg = (val: number) => val >= 0 ? 'bg-[#089981]/10' : 'bg-[#f23645]/10'

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0b0e11] text-[#d1d4dc] font-sans flex flex-col overflow-hidden pt-[60px]">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl border animate-slide-in-top min-w-[300px] text-center ${
            toast.type === 'success' 
              ? 'bg-[#089981]/20 border-[#089981] text-[#089981]' 
              : 'bg-[#f23645]/20 border-[#f23645] text-[#f23645]'
          }`}>
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        )}

        {/* MAIN CONTENT GRID */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-12 gap-4">
        
        {/* ================= LEFT COLUMN: INDICES (Fixed Names) ================= */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="bg-[#131722] rounded-xl border border-[#2a2e39] flex flex-col shadow-lg overflow-hidden h-full">
            <div className="p-4 border-b border-[#2a2e39] bg-[#1e222d] flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">📊 Major Indices</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {indices.map((idx, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedSymbol(idx.symbol)}
                  className="p-4 bg-[#1e222d] rounded-xl border border-[#2a2e39] hover:border-[#2962ff] transition-all group cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-white text-sm group-hover:text-[#2962ff] transition-colors">
                      {getIndexName(idx.symbol)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${getBg(idx.change)} ${getColor(idx.change)}`}>
                      {idx.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-[#787b86]">NSE</span>
                    <span className="text-xl text-white font-mono font-bold">₹{idx.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {indices.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-xs text-[#787b86]">Connecting to Market...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= CENTER COLUMN: CHART & MOVERS ================= */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
          
          {/* Main Chart */}
          {isFullscreen && (
            <div className="fixed inset-0 bg-black/90 z-[9998]" onClick={() => setIsFullscreen(false)} />
          )}
          <div className={`bg-[#131722] ${isFullscreen ? 'rounded-none' : 'rounded-xl'} border border-[#2a2e39] p-4 shadow-lg flex flex-col transition-all ${isFullscreen ? 'fixed inset-0 z-[9999] m-0 p-6 overflow-auto' : 'h-[75%]'}`}>
            {/* Header with Search & Fullscreen */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                {/* Search Bar (NEW) */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1 max-w-md">
                    <div className="flex items-center bg-[#1e222d] border border-[#2a2e39] rounded-lg overflow-hidden focus-within:border-[#2962ff]">
                      <Search size={16} className="ml-3 text-[#787b86]" />
                      <input
                        type="text"
                        placeholder="Search stocks (e.g., TCS, INFY, RELIANCE)..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setShowSearch(true)}
                        className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none"
                      />
                      {searchQuery && (
                        <button onClick={() => {setSearchQuery(''); setSearchSuggestions([])}} className="pr-3 text-[#787b86] hover:text-white">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {/* Search Dropdown */}
                    {showSearch && searchSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e222d] border border-[#2962ff] rounded-lg shadow-2xl z-20 max-h-64 overflow-y-auto">
                        {searchSuggestions.map((sym, i) => (
                          <div
                            key={i}
                            onClick={() => selectSearchStock(sym)}
                            className="px-4 py-2 hover:bg-[#2962ff]/20 cursor-pointer text-white text-sm font-medium border-b border-[#2a2e39] last:border-0 flex justify-between items-center"
                          >
                            <span>{sym.replace('.NS', '')}</span>
                            <span className="text-xs text-[#787b86]">NSE</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Fullscreen Button */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="bg-[#1e222d] border border-[#2a2e39] p-2 rounded-lg hover:border-[#2962ff] text-[#787b86] hover:text-white transition-colors"
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? '⛶' : '⛶'}
                  </button>
                </div>
                
                {/* Stock Info */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">{cleanCompanyName(stockData?.name) || selectedSymbol.replace('.NS', '')}</h2>
                    <button
                      onClick={() => openWatchlistModal(selectedSymbol)}
                      className="bg-[#1b1e29] border border-[#2a2e39] px-2 py-1 rounded-md hover:border-[#2962ff] text-[#9aa0af] hover:text-white transition-colors flex items-center gap-1"
                      title="Add to watchlist"
                    >
                      <Plus size={14} />
                      <span className="text-xs font-semibold hidden sm:inline">Add</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[#787b86]">{stockDescriptor || 'NSE'}</p>
                    {/* Market Status Indicator */}
                    {isMarketOpen() ? (
                      <span className="flex items-center gap-1 text-xs text-[#089981] bg-[#089981]/10 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 bg-[#089981] rounded-full animate-pulse"></span>
                        Market Open
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-[#f23645] bg-[#f23645]/10 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 bg-[#f23645] rounded-full"></span>
                        Market Closed
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {stockData && (
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-white">₹{stockData.price.toFixed(2)}</div>
                  <div className={`text-sm font-medium ${getColor(stockData.change)}`}>
                    {stockData.change > 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                  </div>
                </div>
              )}
            </div>

            {/* Chart Controls */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {/* Timeframe Selector */}
              <div className="flex gap-1 bg-[#1e222d] rounded p-1">
                {['1D', '1W', '1M', '3M', '6M', '1Y'].map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                      timeframe === tf 
                        ? 'bg-[#2962ff] text-white' 
                        : 'text-[#787b86] hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart Type Selector */}
              <div className="flex gap-1 bg-[#1e222d] rounded p-1">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 text-[10px] font-bold rounded ${
                    chartType === 'line' ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  LINE
                </button>
                <button
                  onClick={() => setChartType('candle')}
                  className={`px-3 py-1 text-[10px] font-bold rounded ${
                    chartType === 'candle' ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-white'
                  }`}
                >
                  CANDLE
                </button>
              </div>

              {/* Indicators Toggle */}
              <button
                onClick={() => setShowIndicators(!showIndicators)}
                className={`px-3 py-1 text-[10px] font-bold rounded ${
                  showIndicators ? 'bg-[#089981] text-white' : 'bg-[#1e222d] text-[#787b86] hover:text-white'
                }`}
              >
                📊 INDICATORS
              </button>

              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`px-3 py-1 text-[10px] font-bold rounded ${
                  showVolume ? 'bg-[#089981] text-white' : 'bg-[#1e222d] text-[#787b86] hover:text-white'
                }`}
              >
                📈 VOLUME
              </button>
            </div>

            <div className="flex-1 w-full min-h-0">
              {loading && chartData.length === 0 ? (
                /* Professional Loading Skeleton */
                <div className="h-full w-full bg-gradient-to-br from-[#1e222d] via-[#131722] to-[#1e222d] rounded-lg animate-pulse flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="animate-spin text-[#2962ff] mx-auto mb-2" size={32} />
                    <p className="text-[#787b86] text-sm font-medium">Loading chart data...</p>
                    <p className="text-[#787b86] text-xs mt-1">{timeframe.toUpperCase()} • {selectedSymbol.replace('.NS', '')}</p>
                  </div>
                </div>
              ) : chartType === 'candle' ? (
                <div className="h-full w-full">
                  <LightweightCandle data={chartDataWithIndicators} showVolume={showVolume} />
                </div>
              ) : (
                /* Line Chart with Indicators Support */
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataWithIndicators}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2962ff" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2962ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" vertical={false} />
                    <XAxis dataKey="time" stroke="#50535e" fontSize={10} tickLine={false} axisLine={false} minTickGap={40} />
                    <YAxis 
                      orientation="right" 
                      domain={['auto', 'auto']} 
                      stroke="#50535e" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `₹${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e222d', borderColor: '#2a2e39', color: '#fff' }}
                      content={({ payload }) => {
                        if (payload && payload.length > 0) {
                          const data = payload[0].payload as ChartPoint
                          return (
                            <div className="bg-[#1e222d] border border-[#2a2e39] p-2 rounded text-xs">
                              <p className="text-[#787b86]">{data.time}</p>
                              <p className="text-white">Price: <span className="font-mono text-[#2962ff]">₹{data.price?.toFixed(2)}</span></p>
                              {showIndicators && (
                                <>
                                  {data.sma && <p className="text-[#ff9800] mt-1">SMA(20): ₹{data.sma.toFixed(2)}</p>}
                                  {data.ema && <p className="text-[#2196f3]">EMA(12): ₹{data.ema.toFixed(2)}</p>}
                                </>
                              )}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#2962ff" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                    {/* Technical Indicators for Line Chart */}
                    {showIndicators && (
                      <>
                        <Line type="monotone" dataKey="sma" stroke="#ff9800" strokeWidth={2} dot={false} name="SMA(20)" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="ema" stroke="#2196f3" strokeWidth={2} dot={false} name="EMA(12)" strokeDasharray="3 3" />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {error && (
              <div className="mt-3 text-xs text-[#f23645] bg-[#f23645]/10 border border-[#f23645]/30 rounded px-3 py-2 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-[#f23645] hover:text-white">✕</button>
              </div>
            )}
          </div>

          {/* Movers Section - REAL DATA */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#787b86]">Index:</label>
              <select
                value={selectedIndexForMovers}
                onChange={(e) => setSelectedIndexForMovers(e.target.value)}
                className="bg-[#1e222d] border border-[#2a2e39] px-2 py-1 rounded text-sm text-white"
              >
                {(indicesListNames.length ? indicesListNames : ['NIFTY50','BANKNIFTY','SENSEX']).map((nm) => (
                  <option key={nm} value={nm}>{nm}</option>
                ))}
              </select>
              {loadingMovers && <span className="text-xs text-[#787b86] ml-2">Loading...</span>}
            </div>
            <div className="text-xs text-[#787b86]">Top 5 movers</div>
          </div>
          <div className="grid grid-cols-2 gap-4 h-[25%]">
            {/* Gainers */}
            <div className="bg-[#131722] rounded-xl border border-[#2a2e39] overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[#2a2e39] bg-[#1e222d] flex items-center gap-2">
                <TrendingUp size={16} className="text-[#089981]" />
                <h3 className="font-bold text-white text-xs uppercase">Top Gainers</h3>
              </div>
              <div className="p-2 overflow-y-auto flex-1">
                {gainers.length > 0 ? gainers.map((s, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedSymbol(s.symbol)}
                    className="flex justify-between items-center p-2 mb-1 hover:bg-[#2a2e39] rounded cursor-pointer text-sm"
                  >
                    <div>
                      <span className="text-white font-medium block">{s.symbol.replace('.NS', '')}</span>
                      <span className="text-[10px] text-[#787b86]">₹{s.price.toFixed(2)}</span>
                    </div>
                    <span className="text-[#089981] font-bold">+{s.changePercent.toFixed(2)}%</span>
                  </div>
                )) : (
                  <div className="flex items-center justify-center h-full text-xs text-[#787b86]">
                    Loading...
                  </div>
                )}
              </div>
            </div>
            
            {/* Losers */}
            <div className="bg-[#131722] rounded-xl border border-[#2a2e39] overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[#2a2e39] bg-[#1e222d] flex items-center gap-2">
                <TrendingDown size={16} className="text-[#f23645]" />
                <h3 className="font-bold text-white text-xs uppercase">Top Losers</h3>
              </div>
              <div className="p-2 overflow-y-auto flex-1">
                {losers.length > 0 ? losers.map((s, i) => (
                  <div 
                    key={i}
                    onClick={() => setSelectedSymbol(s.symbol)}
                    className="flex justify-between items-center p-2 mb-1 hover:bg-[#2a2e39] rounded cursor-pointer text-sm"
                  >
                    <div>
                      <span className="text-white font-medium block">{s.symbol.replace('.NS', '')}</span>
                      <span className="text-[10px] text-[#787b86]">₹{s.price.toFixed(2)}</span>
                    </div>
                    <span className="text-[#f23645] font-bold">{s.changePercent.toFixed(2)}%</span>
                  </div>
                )) : (
                  <div className="flex items-center justify-center h-full text-xs text-[#787b86]">
                    Loading...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: WATCHLIST & POPULAR ================= */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <WatchlistPanelComplete
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
            fetchStock={fetchStock}
            fetchStockSuggestions={fetchStockSuggestions}
            cleanCompanyName={cleanCompanyName}
            getColor={getColor}
          />

          {/* Popular Stocks */}
          <div className="bg-[#131722] rounded-xl border border-[#2a2e39] flex flex-col shadow-lg flex-1 min-h-0 overflow-hidden">
            <div className="p-4 border-b border-[#2a2e39] bg-[#1e222d] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2"><Activity size={16}/> Popular Stocks</h3>
              <span className="text-[10px] text-[#787b86]">{popularData.length} items</span>
            </div>
            <div className="overflow-y-auto p-2 flex-1 max-h-[28rem]">
              {popularData.map((stock, i) => (
                <div key={i} className="flex justify-between items-center p-3 mb-1 hover:bg-[#2a2e39] rounded transition-colors group">
                  <div onClick={() => setSelectedSymbol(stock.symbol)} className="flex-1 cursor-pointer flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2962ff] to-[#1e53e5] flex items-center justify-center text-xs font-bold text-white shadow-md group-hover:scale-110 transition-transform">
                      {stock.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-[#2962ff]">{stock.symbol.replace('.NS', '')}</div>
                      <div className="text-[10px] text-[#787b86]">
                        {stock.sector || stock.industry || formatMarketCap(stock.marketCap) || 'NSE'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-xs font-medium ${getColor(stock.change)}`}>
                      {stock.change > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        openWatchlistModal(stock.symbol)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#2962ff] hover:bg-[#1e53e5] text-white p-1.5 rounded-md"
                      title="Add to watchlist"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {popularData.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-xs text-[#787b86]">No popular stocks found</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      </div>

      {/* Add to Watchlist Modal */}
      {watchlistModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setWatchlistModalOpen(false)}>
          <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[#2a2e39] flex items-center justify-between">
              <h3 className="text-white font-bold text-base">Add stock to watchlist</h3>
              <button className="text-[#787b86] hover:text-white" onClick={() => setWatchlistModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {loadingWatchlists ? (
                <p className="text-sm text-[#787b86]">Loading watchlists...</p>
              ) : watchlists.length === 0 ? (
                <p className="text-sm text-[#787b86]">No watchlists yet. Create a new one below.</p>
              ) : (
                watchlists.map((wl) => (
                  <label key={wl.id} className="flex items-center gap-3 text-white text-sm bg-[#161a24] border border-[#2a2e39] rounded-lg px-3 py-2 cursor-pointer hover:border-[#2962ff]">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-[#2962ff]"
                      checked={selectedWatchlistIds.includes(wl.id)}
                      onChange={() => toggleWatchlistSelection(wl.id)}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{wl.watchlist_name}</div>
                      <div className="text-[11px] text-[#787b86]">{wl.symbol?.length || 0} symbols</div>
                    </div>
                  </label>
                ))
              )}

              <div className="border border-[#2a2e39] rounded-lg p-3 space-y-2 bg-[#10131c]">
                <div className="text-xs text-[#9aa0af] font-semibold">+ New Watchlist</div>
                <input
                  type="text"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="Enter watchlist name"
                  className="w-full bg-[#0f1118] border border-[#2a2e39] text-white px-3 py-2 rounded-lg outline-none focus:border-[#2962ff]"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#2a2e39] flex gap-3">
              <button
                onClick={() => setWatchlistModalOpen(false)}
                className="flex-1 bg-[#2a2e39] text-white py-2 rounded-lg font-semibold hover:bg-[#3a3f4f] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveToWatchlists}
                disabled={savingWatchlist}
                className="flex-1 bg-[#2962ff] text-white py-2 rounded-lg font-semibold hover:bg-[#1e53e5] transition-colors disabled:opacity-50"
              >
                {savingWatchlist ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}