import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, LineChart
} from 'recharts'
import { 
  Search, Bell, User, Plus, Activity, TrendingUp, TrendingDown, LogOut, X, Check,
  ChevronRight, ChevronDown, Pencil, Trash2, CheckCircle2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import Navbar from '@/components/Navbar'

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

interface WatchlistResponse {
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
  
  // PROFESSIONAL SETTINGS - Thick Candles like Zerodha/TradingView
  const wickWidth = 2          // Wick thickness
  const bodyWidth = width * 0.7  // Body takes 70% of available width (FAT!)
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
      />
      {/* Lower Wick (Body to Low) */}
      <line
        x1={centerX}
        y1={bodyBottom}
        x2={centerX}
        y2={yLow}
        stroke={color}
        strokeWidth={wickWidth}
      />
      {/* Candle Body - THICK & PROFESSIONAL */}
      <rect
        x={x + (width - bodyWidth) / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={1}
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
  const [showVolume, setShowVolume] = useState(true)
  const [showIndicators, setShowIndicators] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false) // NEW: Fullscreen mode
  
  // Search State - NEW
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])
  const [showSearch, setShowSearch] = useState(false)
  
  // Columns Data
  const [indices, setIndices] = useState<StockData[]>([])
  const [watchlistData, setWatchlistData] = useState<StockData[]>([])
  const [popularData, setPopularData] = useState<StockData[]>([])
  const [gainers, setGainers] = useState<StockData[]>([]) // NEW: Real gainers
  const [losers, setLosers] = useState<StockData[]>([]) // NEW: Real losers
  
  // Watchlist Adding State
  const [isAddingWatchlist, setIsAddingWatchlist] = useState(false)
  const [newWatchlistSymbol, setNewWatchlistSymbol] = useState('')
  const [addingLoading, setAddingLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  // Toast Notification State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  
  // Watchlist Backend State - MULTI-WATCHLIST SUPPORT
  const [allWatchlists, setAllWatchlists] = useState<WatchlistItem[]>([])
  const [currentWatchlist, setCurrentWatchlist] = useState<WatchlistItem | null>(null)
  const [expandedWatchlistId, setExpandedWatchlistId] = useState<number | null>(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  
  // Create Watchlist Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWatchlistName, setNewWatchlistName] = useState('')
  const [newWatchlistSymbols, setNewWatchlistSymbols] = useState<string[]>([])
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [modalSearchResults, setModalSearchResults] = useState<string[]>([])
  const [creatingWatchlist, setCreatingWatchlist] = useState(false)

  // Rename Watchlist State
  const [renamingWatchlistId, setRenamingWatchlistId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTargetWatchlist, setDeleteTargetWatchlist] = useState<WatchlistItem | null>(null)
  
  // Add Popular Stock to Watchlist Modal State
  const [showAddToWatchlistModal, setShowAddToWatchlistModal] = useState(false)
  const [selectedPopularStock, setSelectedPopularStock] = useState<StockData | null>(null)
  const [selectedWatchlistIds, setSelectedWatchlistIds] = useState<Set<number>>(new Set())
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)
  const [showAddSymbolModal, setShowAddSymbolModal] = useState(false)
  const [addSymbolQuery, setAddSymbolQuery] = useState('')
  const [addSymbolSuggestions, setAddSymbolSuggestions] = useState<string[]>([])
  const [selectedAddSymbol, setSelectedAddSymbol] = useState<string | null>(null)
  
  // Dynamic lists loaded from backend
  const [allStockSymbols, setAllStockSymbols] = useState<string[]>([])
  const [indicesSymbols, setIndicesSymbols] = useState<string[]>([])
  
  // Fallback for indices if backend not ready
  const INDICES_SYMBOLS = ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT']

  const stockDescriptor = useMemo(() => {
    const parts: string[] = []
    const exch = stockData?.exchange || normalizeExchange(undefined, selectedSymbol)
    if (exch) parts.push(exch)
    if (stockData?.marketCap) parts.push(formatMarketCap(stockData.marketCap))
    if (stockData?.sector) parts.push(stockData.sector)
    return parts.join(' • ')
  }, [stockData, selectedSymbol])

  const watchlistStats = useMemo(() => {
    if (!watchlistData.length) return { avgChange: 0, avgChangePct: 0 }
    const totalChange = watchlistData.reduce((sum, s) => sum + s.change, 0)
    const totalPct = watchlistData.reduce((sum, s) => sum + s.changePercent, 0)
    return {
      avgChange: totalChange / watchlistData.length,
      avgChangePct: totalPct / watchlistData.length,
    }
  }, [watchlistData])

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
  const loadStockList = async () => {
    try {
      const res = await api.get('/stocks/list')
      const stocks = res.data
      const symbols = stocks.map((s: any) => s.symbol)
      setAllStockSymbols(symbols)
    } catch (err) {
      console.error('Failed to load stock list:', err)
    }
  }
  
  // Load indices list
  const loadIndicesList = async () => {
    try {
      const res = await api.get('/indices/list')
      const indices = res.data
      setIndicesSymbols(indices)
    } catch (err) {
      console.error('Failed to load indices list:', err)
      // Keep fallback
    }
  }

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

      // Map UI timeframe to number of days the backend should return
      const daysByInterval: Record<string, number> = {
        '1D': 7,   // short window but a few candles for context
        '1W': 14,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
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

  // --- WATCHLIST BACKEND FUNCTIONS ---

  // Load All Watchlists for User
  const loadAllWatchlists = async (email: string) => {
    try {
      const res = await api.get(`/watchlist/detail/${email}`)
      const watchlists: WatchlistResponse[] = res.data || []
      setAllWatchlists(watchlists)
      
      // Set first as current if available
      if (watchlists.length > 0) {
        setCurrentWatchlist(watchlists[0])
        setExpandedWatchlistId(watchlists[0].id)
        return watchlists[0]
      } else {
        return null
      }
    } catch (err) {
      console.error('Error loading watchlists:', err)
      return null
    }
  }
  
  // Create New Watchlist
  const createNewWatchlist = async () => {
    const userEmail = localStorage.getItem('user_email')
    if (!userEmail) {
      showToast('❌ Please login first', 'error')
      return
    }
    
    if (!newWatchlistName.trim()) {
      showToast('❌ Please enter watchlist name', 'error')
      return
    }
    
    setCreatingWatchlist(true)
    try {
      const res = await api.post('/watchlist/', {
        email: userEmail,
        watchlist_name: newWatchlistName.trim(),
        symbols: newWatchlistSymbols
      })
      
      const newWatchlist = res.data
      setAllWatchlists(prev => [...prev, newWatchlist])
      setCurrentWatchlist(newWatchlist)
      
      // Load prices for new watchlist
      const symbols = newWatchlist.symbol || []
      const wResults = await Promise.all(symbols.map((s: string) => fetchStock(s)))
      setWatchlistData(wResults.filter(Boolean) as StockData[])
      
      showToast(`✅ Watchlist "${newWatchlistName}" created`, 'success')
      
      // Reset modal
      setShowCreateModal(false)
      setNewWatchlistName('')
      setNewWatchlistSymbols([])
      setModalSearchQuery('')
      setModalSearchResults([])
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to create watchlist'
      showToast(`❌ ${msg}`, 'error')
    } finally {
      setCreatingWatchlist(false)
    }
  }
  
  // Switch Active Watchlist
  const switchWatchlist = async (watchlist: WatchlistItem) => {
    setCurrentWatchlist(watchlist)
    setExpandedWatchlistId(watchlist.id)
    const symbols = watchlist.symbol || []
    setWatchlistLoading(true)
    const wResults = await Promise.all(symbols.map((s: string) => fetchStock(s)))
    setWatchlistData(wResults.filter(Boolean) as StockData[])
    setWatchlistLoading(false)
  }
  
  // Delete Watchlist
  const deleteWatchlist = async (watchlistId: number) => {
    if (!confirm('Delete this watchlist?')) return
    
    try {
      await api.delete(`/watchlist/${watchlistId}`)
      setAllWatchlists(prev => prev.filter(w => w.id !== watchlistId))
      
      // Switch to first remaining watchlist or clear
      const remaining = allWatchlists.filter(w => w.id !== watchlistId)
      if (remaining.length > 0) {
        switchWatchlist(remaining[0])
      } else {
        setCurrentWatchlist(null)
        setWatchlistData([])
      }
      
      showToast('🗑️ Watchlist deleted', 'success')
    } catch (err) {
      showToast('❌ Failed to delete watchlist', 'error')
    }
  }

  // Rename Watchlist
  const renameWatchlist = async (watchlistId: number, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) {
      showToast('❌ Please enter a name', 'error')
      return
    }

    try {
      const res = await api.put(`/watchlist/${watchlistId}`, {
        watchlist_name: trimmed,
      })

      const updated = res.data
      setAllWatchlists(prev => prev.map(w => w.id === watchlistId ? updated : w))
      if (currentWatchlist?.id === watchlistId) {
        setCurrentWatchlist(updated)
      }
      showToast('✅ Watchlist renamed', 'success')
      setRenamingWatchlistId(null)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to rename watchlist'
      showToast(`❌ ${msg}`, 'error')
    }
  }
  
  // Modal: Search stocks
  const handleModalSearch = async (query: string) => {
    setModalSearchQuery(query)
    if (query.length >= 2) {
      const matches = (await fetchStockSuggestions(query, 10)).filter((s: string) => !newWatchlistSymbols.includes(s))
      setModalSearchResults(matches)
    } else {
      setModalSearchResults([])
    }
  }

  // Quick add modal search
  const handleAddSymbolSearch = async (query: string) => {
    setAddSymbolQuery(query)
    if (query.length >= 2) {
      const matches = await fetchStockSuggestions(query, 10)
      setAddSymbolSuggestions(matches)
    } else {
      setAddSymbolSuggestions([])
    }
  }
  
  // Modal: Add symbol to new watchlist
  const addSymbolToNewWatchlist = (symbol: string) => {
    if (!newWatchlistSymbols.includes(symbol)) {
      setNewWatchlistSymbols(prev => [...prev, symbol])
      setModalSearchQuery('')
      setModalSearchResults([])
    }
  }
  
  // Modal: Remove symbol from new watchlist
  const removeSymbolFromNewWatchlist = (symbol: string) => {
    setNewWatchlistSymbols(prev => prev.filter(s => s !== symbol))
  }

  // Toggle expand/collapse for a watchlist card
  const toggleExpandWatchlist = async (wl: WatchlistItem) => {
    if (expandedWatchlistId === wl.id) {
      setExpandedWatchlistId(null)
      return
    }
    setExpandedWatchlistId(wl.id)
    if (currentWatchlist?.id !== wl.id) {
      await switchWatchlist(wl)
    }
  }

  // Add Symbol to Backend Watchlist
  const addSymbolToBackend = async (watchlistId: number, symbol: string): Promise<boolean> => {
    try {
      await api.post(`/watchlist/${watchlistId}/add-symbol/${symbol}`)
      return true
    } catch (err: any) {
      console.error('Error adding symbol to backend:', err)
      if (err?.response?.data?.detail) {
        showToast(err.response.data.detail, 'error')
      }
      return false
    }
  }

  // Remove Symbol from Backend Watchlist
  const removeSymbolFromBackend = async (watchlistId: number, symbol: string): Promise<boolean> => {
    try {
      console.log('🗑️ Deleting symbol:', symbol, 'from watchlist:', watchlistId)
      const response = await api.delete(`/watchlist/${watchlistId}/remove-symbol/${symbol}`)
      console.log('✅ Delete successful. Response:', response.data)
      
      // Verify the symbol was actually removed from backend
      if (response.data && response.data.symbol) {
        console.log('Updated backend symbols:', response.data.symbol)
        // Update currentWatchlist with backend response
        setCurrentWatchlist(response.data)
      }
      
      return true
    } catch (err: any) {
      console.error('❌ Error removing symbol from backend:', err)
      console.error('Error details:', err?.response?.data)
      if (err?.response?.data?.detail) {
        showToast(err.response.data.detail, 'error')
      } else {
        showToast('❌ Network error. Please check backend server', 'error')
      }
      return false
    }
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
          const historicalData = await fetchHistoricalData(selectedSymbol, timeframe)

          // If backend returned nothing, fall back to synthetic so UI still updates
          if (!historicalData.length) {
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

  // Load All Watchlists & Popular Stocks on Mount
  useEffect(() => {
    const load = async () => {
      setWatchlistLoading(true)
      
      const userEmail = localStorage.getItem('user_email')
      
      if (userEmail) {
        const watchlist = await loadAllWatchlists(userEmail)
        
        if (watchlist) {
          const symbols = watchlist.symbol || []
          const wResults = await Promise.all(symbols.map(s => fetchStock(s)))
          setWatchlistData(wResults.filter(Boolean) as StockData[])
        }
      }
      
      // Load popular stocks from backend (more items for scrolling)
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
      
      setWatchlistLoading(false)
    }
    load()
  }, [])

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

  const handleWatchlistInput = async (value: string) => {
    setNewWatchlistSymbol(value)
    if (value.length > 0) {
      const matches = await fetchStockSuggestions(value, 5)
      setSuggestions(matches)
    } else {
      setSuggestions([])
    }
  }

  const validateSymbol = (symbol: string): boolean => {
    const upperSym = symbol.toUpperCase()
    // Only allow symbols that exist in our database
    return allStockSymbols.includes(upperSym)
  }

  const handleAddWatchlist = async (symbolOverride?: string) => {
    const symbol = symbolOverride || newWatchlistSymbol
    if (!symbol) return
    
    const upperSymbol = symbol.toUpperCase()
    
    // Validate symbol - must be from our database
    if (!allStockSymbols.includes(upperSymbol)) {
      showToast('❌ Invalid symbol! Please select from the suggestions', 'error')
      return
    }
    
    setAddingLoading(true)
    
    // Check if already exists
    if (watchlistData.find(s => s.symbol === upperSymbol)) {
      showToast('⚠️ Stock already in your watchlist', 'error')
      setAddingLoading(false)
      return
    }
    
    // Add to backend first
    if (currentWatchlist) {
      console.log('Adding symbol:', upperSymbol, 'to watchlist ID:', currentWatchlist.id)
      const success = await addSymbolToBackend(currentWatchlist.id, upperSymbol)
      
      if (success) {
        // Fetch stock price and add to UI
        const stock = await fetchStock(upperSymbol)
        if (stock) {
          setWatchlistData(prev => [stock, ...prev])
          setCurrentWatchlist(prev => prev ? {...prev, symbol: [upperSymbol, ...prev.symbol]} : prev)
          showToast(`✅ ${upperSymbol.replace('.NS', '')} added to watchlist`, 'success')
          setNewWatchlistSymbol('')
          setSuggestions([])
          setIsAddingWatchlist(false)
        } else {
          showToast('❌ Unable to fetch stock data', 'error')
        }
      }
    } else {
      showToast('❌ Please login to add stocks', 'error')
    }
    
    setAddingLoading(false)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
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
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
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
                    {/* Fixed Name Display */}
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
          <div className={`bg-[#131722] rounded-xl border border-[#2a2e39] p-4 shadow-lg flex flex-col transition-all ${isFullscreen ? 'fixed inset-4 z-50 h-auto' : 'h-[75%]'}`}>
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
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">{cleanCompanyName(stockData?.name) || selectedSymbol.replace('.NS', '')}</h2>
                    <button
                      onClick={() => {
                        setSelectedAddSymbol(selectedSymbol)
                        setAddSymbolQuery(selectedSymbol)
                        setAddSymbolSuggestions([])
                        setSelectedWatchlistIds(new Set())
                        setShowAddSymbolModal(true)
                      }}
                      className="inline-flex items-center gap-2 bg-[#1e222d] border border-[#2a2e39] hover:border-[#2962ff] text-[#d0d2dc] hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      title="Add this or another stock to a watchlist"
                    >
                      <Plus size={14} /> Search & Add
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
                /* Candlestick Chart with Volume */
                <div className="h-full w-full flex flex-col gap-2">
                  <div className="flex-1 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={chartDataWithIndicators} 
                        barCategoryGap="10%" 
                        barGap={1}
                        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2a2e39" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#2a2e39" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" vertical={false} opacity={0.3} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#50535e" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={{ stroke: '#2a2e39', strokeWidth: 1 }} 
                          minTickGap={30}
                          tick={{ fill: '#787b86' }}
                        />
                        <YAxis 
                          orientation="right" 
                          domain={[(dataMin: number) => Math.floor(dataMin * 0.998), (dataMax: number) => Math.ceil(dataMax * 1.002)]} 
                          stroke="#50535e" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={{ stroke: '#2a2e39', strokeWidth: 1 }}
                          tick={{ fill: '#787b86' }}
                          tickFormatter={(value) => `₹${value.toFixed(0)}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e222d', borderColor: '#2a2e39', color: '#fff', fontSize: 11 }} 
                          content={({ payload }) => {
                            if (payload && payload.length > 0) {
                              const data = payload[0].payload as ChartPoint
                              return (
                                <div className="bg-[#1e222d] border border-[#2a2e39] p-2 rounded text-xs">
                                  <p className="text-[#787b86]">{data.time}</p>
                                  <p className="text-white">O: <span className="font-mono">₹{data.open?.toFixed(2)}</span></p>
                                  <p className="text-white">H: <span className="font-mono text-[#089981]">₹{data.high?.toFixed(2)}</span></p>
                                  <p className="text-white">L: <span className="font-mono text-[#f23645]">₹{data.low?.toFixed(2)}</span></p>
                                  <p className="text-white">C: <span className="font-mono">₹{data.close?.toFixed(2)}</span></p>
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
                        {/* Candlestick using custom shape */}
                        <Bar 
                          dataKey="high" 
                          shape={Candlestick} 
                          fill="transparent"
                          isAnimationActive={false}
                        />
                        {/* Technical Indicators */}
                        {showIndicators && (
                          <>
                            <Line type="monotone" dataKey="sma" stroke="#ff9800" strokeWidth={1.5} dot={false} name="SMA(20)" />
                            <Line type="monotone" dataKey="ema" stroke="#2196f3" strokeWidth={1.5} dot={false} name="EMA(12)" />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {showVolume && (
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataWithIndicators}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" vertical={false} />
                          <XAxis dataKey="time" stroke="#50535e" fontSize={8} tickLine={false} axisLine={false} hide />
                          <YAxis orientation="right" stroke="#50535e" fontSize={8} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e222d', borderColor: '#2a2e39', fontSize: 10 }} 
                            formatter={(value: any) => [value.toLocaleString(), 'Volume']}
                          />
                          {/* Volume bars with color based on candle direction */}
                          <Bar 
                            dataKey="volume" 
                            radius={[2, 2, 0, 0]}
                            shape={(props: any) => {
                              const { x, y, width, height, payload } = props
                              // Green if close >= open, Red otherwise
                              const isGreen = payload.close >= payload.open
                              const color = isGreen ? '#26a69a' : '#ef5350'
                              return (
                                <rect
                                  x={x}
                                  y={y}
                                  width={width}
                                  height={height}
                                  fill={color}
                                  opacity={0.6}
                                />
                              )
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
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
          
          {/* Multi-Watchlist Panel styled like reference */}
          <div className="bg-[#0f1118] rounded-xl border border-[#1f2330] flex flex-col shadow-lg h-[40%] overflow-hidden">
            <div className="p-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-[#2a2e39] hover:bg-[#1e222d] text-white font-semibold py-2 rounded-md border border-[#3a3f4f] transition-colors text-sm"
              >
                + New Watchlist
              </button>
            </div>

            <div className="overflow-y-auto px-2 pb-3 flex-1 space-y-2">
              {allWatchlists.length === 0 && (
                <div className="text-center text-xs text-[#787b86] py-6">No watchlists yet. Create one to start tracking.</div>
              )}

              {allWatchlists.map((wl) => {
                const isActive = currentWatchlist?.id === wl.id
                const symbolCount = wl.symbol?.length || 0
                return (
                  <div key={wl.id} className="bg-[#131722] border border-[#1f2330] rounded-lg overflow-hidden">
                    <div className="w-full flex items-center justify-between px-3 py-3 text-white">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleExpandWatchlist(wl)}
                      >
                        {renamingWatchlistId === wl.id ? (
                          <input
                            className="bg-[#1b2030] border border-[#2a2e39] text-sm text-white px-2 py-1 rounded outline-none focus:border-[#2962ff]"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            maxLength={50}
                            autoFocus
                          />
                        ) : (
                          <>
                            <span className="text-base font-semibold">{wl.watchlist_name}</span>
                            <span className="text-[10px] text-[#787b86]">{symbolCount} Symbols</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[#cfd3dc]">
                        {expandedWatchlistId === wl.id && renamingWatchlistId !== wl.id && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setRenamingWatchlistId(wl.id)
                                setRenameValue(wl.watchlist_name)
                                setIsAddingWatchlist(false)
                                setShowRenameModal(true)
                              }}
                              className="p-2 rounded-md bg-[#1f2330] border border-[#2a2e39] text-[#c3d4ff] hover:border-[#2962ff] hover:text-white transition-colors"
                              title="Rename"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setDeleteTargetWatchlist(wl); 
                                setShowDeleteModal(true);
                              }}
                              className="p-2 rounded-md bg-[#1f2330] border border-[#2a2e39] text-[#f8b4b4] hover:border-[#f23645] hover:text-white transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}

                        <div
                          onClick={() => toggleExpandWatchlist(wl)}
                          className="w-6 h-6 rounded border border-[#2a2e39] bg-[#0f1320] flex items-center justify-center cursor-pointer"
                        >
                          {expandedWatchlistId === wl.id ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedWatchlistId === wl.id && (
                      <div className="px-3 pb-3 space-y-3">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between text-xs text-[#787b86] pt-2">
                          <span>Stocks</span>
                        </div>

                        {/* Watchlist Items */}
                        <div className="space-y-2">
                          {watchlistLoading ? (
                            <div className="text-center text-xs text-[#787b86] py-6">Loading watchlist...</div>
                          ) : watchlistData.length > 0 ? (
                            watchlistData.map((stock) => (
                              <div
                                key={stock.symbol}
                                className="group flex items-center justify-between bg-[#1b2030] border border-[#1f2330] rounded-lg px-3 py-2 hover:border-[#2962ff] transition-colors cursor-pointer gap-2"
                                onClick={() => setSelectedSymbol(stock.symbol)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-white leading-tight">{stock.symbol.replace('.NS', '')}</div>
                                  <div className="text-[10px] text-[#787b86]">{cleanCompanyName(stock.name) || 'NSE'}</div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-sm text-white font-mono">₹{stock.price.toFixed(2)}</div>
                                  <div className={`text-xs ${getColor(stock.change)}`}>{stock.changePercent.toFixed(2)}%</div>
                                </div>

                                {/* Hover Remove Control - Checkmark visible, X on hover */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (currentWatchlist) {
                                      const ok = await removeSymbolFromBackend(currentWatchlist.id, stock.symbol)
                                      if (ok) {
                                        setWatchlistData(prev => prev.filter(s => s.symbol !== stock.symbol))
                                        setCurrentWatchlist(prev => prev ? { ...prev, symbol: (prev.symbol || []).filter(sym => sym !== stock.symbol) } : prev)
                                        showToast(`✅ Removed ${stock.symbol.replace('.NS','')} from watchlist`, 'success')
                                      }
                                    }
                                  }}
                                  className="flex-shrink-0 w-7 h-7 rounded-full border border-[#2a2e39] bg-[#0f1320] text-[#787b86] hover:text-[#f23645] hover:border-[#f23645] flex items-center justify-center transition-colors"
                                  title="Remove from watchlist"
                                >
                                  <CheckCircle2 className="group-hover:hidden" size={14} />
                                  <X className="hidden group-hover:block" size={11} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-xs text-[#787b86] py-6">No symbols in this watchlist</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Popular Stocks */}
          <div className="bg-[#131722] rounded-xl border border-[#2a2e39] flex flex-col shadow-lg h-[65%] overflow-hidden">
            <div className="p-4 border-b border-[#2a2e39] bg-[#1e222d] flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2"><Activity size={16}/> Popular Stocks</h3>
              <span className="text-[10px] text-[#787b86]">{popularData.length} items</span>
            </div>
            <div className="overflow-y-auto p-2 flex-1 max-h-[28rem]">
              {popularData.map((stock, i) => (
                <div key={i} className="flex justify-between items-center p-3 mb-1 hover:bg-[#2a2e39] rounded transition-colors group">
                  <div onClick={() => setSelectedSymbol(stock.symbol)} className="flex-1 cursor-pointer flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#2a2e39] flex items-center justify-center text-[10px] font-bold text-white group-hover:bg-[#2962ff] transition-colors">
                      {stock.symbol[0]}
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
                      {stock.change > 0 ? '+' : ''}{stock.change.toFixed(1)}%
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPopularStock(stock)
                        setSelectedWatchlistIds(new Set())
                        setShowAddToWatchlistModal(true)
                      }}
                      className="p-1.5 rounded bg-[#2a2e39] border border-[#2a2e39] text-[#787b86] hover:border-[#2962ff] hover:text-white transition-colors"
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
      
      {/* CREATE WATCHLIST MODAL (Matches Reference Image) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-[#2a2e39] flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Add a New Watchlist</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#787b86] hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Watchlist Name Input */}
              <div>
                <label className="text-sm text-[#787b86] mb-2 block">New Watchlist Name</label>
                <input
                  type="text"
                  placeholder="Watchlist 1"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="w-full bg-[#1e222d] border border-[#2a2e39] text-white px-4 py-3 rounded-lg outline-none focus:border-[#2962ff]"
                  maxLength={50}
                />
              </div>
              
              {/* Stock Search Section */}
              <div>
                <label className="text-sm text-[#787b86] mb-2 block">Select symbols to add to your new watchlist</label>
                <div className="relative">
                  <div className="flex items-center bg-[#1e222d] border border-[#2a2e39] rounded-lg px-3 py-2 focus-within:border-[#2962ff]">
                    <Search size={16} className="text-[#787b86] mr-2" />
                    <input
                      type="text"
                      placeholder="Search stocks, ETFs, & more"
                      value={modalSearchQuery}
                      onChange={(e) => handleModalSearch(e.target.value)}
                      className="flex-1 bg-transparent text-white text-sm outline-none"
                    />
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {modalSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e222d] border border-[#2962ff] rounded-lg shadow-2xl max-h-48 overflow-y-auto z-10">
                      {modalSearchResults.map((sym, i) => (
                        <div
                          key={i}
                          onClick={() => addSymbolToNewWatchlist(sym)}
                          className="px-4 py-2 hover:bg-[#2962ff]/20 cursor-pointer text-white text-sm border-b border-[#2a2e39] last:border-0 flex justify-between items-center"
                        >
                          <span className="font-medium">{sym.replace('.NS', '')}</span>
                          <span className="text-xs text-[#787b86]">NSE</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Selected Symbols */}
              <div className="flex flex-wrap gap-2 min-h-[60px] max-h-[120px] overflow-y-auto p-2 bg-[#1e222d]/50 rounded-lg border border-[#2a2e39]">
                {newWatchlistSymbols.length === 0 ? (
                  <div className="w-full flex items-center justify-center text-xs text-[#787b86] py-4">
                    No symbols added yet
                  </div>
                ) : (
                  newWatchlistSymbols.map((sym, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#2962ff] text-white px-3 py-1.5 rounded-full text-xs font-medium">
                      <span>{sym.replace('.NS', '')}</span>
                      <button
                        onClick={() => removeSymbolFromNewWatchlist(sym)}
                        className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              {/* Suggested Stocks (Optional - Like Image) */}
              <div>
                <p className="text-xs text-[#787b86] mb-2">Suggested for you</p>
                <div className="flex flex-wrap gap-2">
                  {['INFY.NS', 'RELIANCE.NS', 'NIFTY.NS', 'BTC.NS', 'INRUSD.NS', 'ETH.NS'].map((sym, i) => (
                    <button
                      key={i}
                      onClick={() => addSymbolToNewWatchlist(sym)}
                      disabled={newWatchlistSymbols.includes(sym)}
                      className="flex items-center gap-2 bg-[#1e222d] border border-[#2a2e39] hover:border-[#2962ff] text-white px-3 py-1.5 rounded-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{sym.replace('.NS', '')}</span>
                      <Plus size={12} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Footer Buttons */}
            <div className="p-5 border-t border-[#2a2e39] flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 bg-[#2a2e39] text-white rounded-lg hover:bg-[#3a3e49] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createNewWatchlist}
                disabled={creatingWatchlist || !newWatchlistName.trim()}
                className="px-6 py-2.5 bg-[#2962ff] text-white rounded-lg hover:bg-[#1e53e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
              >
                {creatingWatchlist ? (
                  <>
                    <Activity className="animate-spin" size={16} />
                    Creating...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STOCK (SEARCH) TO WATCHLIST MODAL */}
      {showAddSymbolModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddSymbolModal(false); setSelectedAddSymbol(null); setAddSymbolSuggestions([]); setSelectedWatchlistIds(new Set()) }}>
          <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-[#2a2e39] flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Add stock to watchlist</h2>
              <button onClick={() => { setShowAddSymbolModal(false); setSelectedAddSymbol(null); setAddSymbolSuggestions([]); setSelectedWatchlistIds(new Set()) }} className="text-[#787b86] hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Search */}
              <div className="relative">
                <label className="text-sm text-[#787b86] mb-2 block font-medium">Search any stock</label>
                <div className="flex items-center bg-[#1e222d] border border-[#2a2e39] rounded-lg px-3 py-2 focus-within:border-[#2962ff]">
                  <Search size={16} className="text-[#787b86] mr-2" />
                  <input
                    type="text"
                    placeholder="Search stocks, ETFs, & more"
                    value={addSymbolQuery}
                    onChange={(e) => handleAddSymbolSearch(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm outline-none"
                  />
                  {addSymbolQuery && (
                    <button
                      onClick={() => { setAddSymbolQuery(''); setAddSymbolSuggestions([]); setSelectedAddSymbol(null) }}
                      className="text-[#787b86] hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {addSymbolSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e222d] border border-[#2962ff] rounded-lg shadow-2xl max-h-48 overflow-y-auto z-10">
                    {addSymbolSuggestions.map((sym, i) => (
                      <div
                        key={i}
                        onClick={() => { setSelectedAddSymbol(sym); setAddSymbolQuery(sym); setAddSymbolSuggestions([]) }}
                        className="px-4 py-2 hover:bg-[#2962ff]/20 cursor-pointer text-white text-sm border-b border-[#2a2e39] last:border-0 flex justify-between items-center"
                      >
                        <span className="font-medium">{sym.replace('.NS', '')}</span>
                        <span className="text-xs text-[#787b86]">NSE</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected symbol */}
              <div className="bg-[#0f1118] border border-[#2a2e39] rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#787b86]">Selected</span>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-[#2962ff]/10 text-[#d0e0ff] border border-[#2962ff]/40">
                    {selectedAddSymbol ? selectedAddSymbol.replace('.NS', '') : 'Pick a symbol'}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedAddSymbol(selectedSymbol); setAddSymbolQuery(selectedSymbol); setAddSymbolSuggestions([]) }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2e39] bg-[#1e222d] text-[#d0d2dc] hover:border-[#2962ff] hover:text-white"
                >
                  Use current
                </button>
              </div>

              {/* Watchlist Checkboxes */}
              <div>
                <label className="text-sm text-[#787b86] mb-3 block font-medium">Select watchlists</label>
                <div className="space-y-2 bg-[#0f1118] rounded-lg p-3 max-h-64 overflow-y-auto">
                  {allWatchlists.length === 0 ? (
                    <p className="text-xs text-[#787b86] text-center py-4">No watchlists yet. Create one first.</p>
                  ) : (
                    allWatchlists.map((wl) => (
                      <label key={wl.id} className="flex items-center gap-3 p-2 hover:bg-[#1e222d] rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedWatchlistIds.has(wl.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedWatchlistIds)
                            if (e.target.checked) {
                              newSet.add(wl.id)
                            } else {
                              newSet.delete(wl.id)
                            }
                            setSelectedWatchlistIds(newSet)
                          }}
                          className="w-4 h-4 rounded accent-[#2962ff]"
                        />
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium">{wl.watchlist_name}</div>
                          <div className="text-xs text-[#787b86]">{wl.symbol?.length || 0} symbols</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#2a2e39] flex gap-3 justify-end">
              <button
                onClick={() => { setShowAddSymbolModal(false); setSelectedAddSymbol(null); setAddSymbolSuggestions([]); setSelectedWatchlistIds(new Set()) }}
                className="px-6 py-2 bg-[#2a2e39] text-white rounded-lg hover:bg-[#3a3e49] transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedAddSymbol) {
                    showToast('❌ Pick a stock first', 'error')
                    return
                  }
                  if (selectedWatchlistIds.size === 0) {
                    showToast('❌ Select at least one watchlist', 'error')
                    return
                  }

                  setAddingToWatchlist(true)
                  let successCount = 0
                  for (const watchlistId of selectedWatchlistIds) {
                    const success = await addSymbolToBackend(watchlistId, selectedAddSymbol)
                    if (success) successCount++
                  }
                  setAddingToWatchlist(false)

                  if (successCount === selectedWatchlistIds.size) {
                    showToast(`✅ Added to ${successCount} watchlist${successCount > 1 ? 's' : ''}`, 'success')
                    setShowAddSymbolModal(false)
                    setSelectedAddSymbol(null)
                    setSelectedWatchlistIds(new Set())
                  } else {
                    showToast(`⚠️ Added to ${successCount}/${selectedWatchlistIds.size} watchlists`, 'error')
                  }
                }}
                disabled={addingToWatchlist || !selectedAddSymbol || selectedWatchlistIds.size === 0}
                className="px-6 py-2 bg-[#2962ff] text-white rounded-lg hover:bg-[#1e53e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {addingToWatchlist ? 'Adding...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD POPULAR STOCK TO WATCHLIST MODAL */}
      {showAddToWatchlistModal && selectedPopularStock && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddToWatchlistModal(false)}>
          <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-[#2a2e39] flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Add to Watchlist</h2>
              <button onClick={() => setShowAddToWatchlistModal(false)} className="text-[#787b86] hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Stock Info */}
              <div className="flex items-center gap-3 bg-[#1e222d] p-3 rounded-lg">
                <div className="w-10 h-10 rounded bg-[#2a2e39] flex items-center justify-center text-sm font-bold text-white">
                  {selectedPopularStock.symbol[0]}
                </div>
                <div>
                  <div className="font-bold text-white">{selectedPopularStock.symbol.replace('.NS', '')}</div>
                  <div className="text-xs text-[#787b86]">₹{selectedPopularStock.price.toFixed(2)}</div>
                </div>
              </div>

              {/* Watchlist Checkboxes */}
              <div>
                <label className="text-sm text-[#787b86] mb-3 block font-medium">Select watchlists</label>
                <div className="space-y-2 bg-[#0f1118] rounded-lg p-3 max-h-64 overflow-y-auto">
                  {allWatchlists.length === 0 ? (
                    <p className="text-xs text-[#787b86] text-center py-4">No watchlists yet. Create one first.</p>
                  ) : (
                    allWatchlists.map((wl) => (
                      <label key={wl.id} className="flex items-center gap-3 p-2 hover:bg-[#1e222d] rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedWatchlistIds.has(wl.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedWatchlistIds)
                            if (e.target.checked) {
                              newSet.add(wl.id)
                            } else {
                              newSet.delete(wl.id)
                            }
                            setSelectedWatchlistIds(newSet)
                          }}
                          className="w-4 h-4 rounded accent-[#2962ff]"
                        />
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium">{wl.watchlist_name}</div>
                          <div className="text-xs text-[#787b86]">{wl.symbol?.length || 0} symbols</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Create New Watchlist */}
              <button
                onClick={() => {
                  setShowAddToWatchlistModal(false)
                  setShowCreateModal(true)
                }}
                className="w-full py-2.5 bg-[#1e222d] border border-[#2a2e39] text-[#787b86] hover:text-white hover:border-[#2962ff] rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} /> New Watchlist
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-[#2a2e39] flex gap-3 justify-end">
              <button
                onClick={() => setShowAddToWatchlistModal(false)}
                className="px-6 py-2 bg-[#2a2e39] text-white rounded-lg hover:bg-[#3a3e49] transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedWatchlistIds.size === 0) {
                    showToast('❌ Select at least one watchlist', 'error')
                    return
                  }
                  
                  setAddingToWatchlist(true)
                  let successCount = 0
                  
                  for (const watchlistId of selectedWatchlistIds) {
                    const success = await addSymbolToBackend(watchlistId, selectedPopularStock.symbol)
                    if (success) successCount++
                  }
                  
                  setAddingToWatchlist(false)
                  
                  if (successCount === selectedWatchlistIds.size) {
                    showToast(`✅ Added to ${successCount} watchlist${successCount > 1 ? 's' : ''}`, 'success')
                    setShowAddToWatchlistModal(false)
                  } else {
                    showToast(`⚠️ Added to ${successCount}/${selectedWatchlistIds.size} watchlists`, 'error')
                  }
                }}
                disabled={addingToWatchlist || selectedWatchlistIds.size === 0}
                className="px-6 py-2 bg-[#2962ff] text-white rounded-lg hover:bg-[#1e53e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {addingToWatchlist ? 'Adding...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE WATCHLIST CONFIRMATION MODAL */}
      {showDeleteModal && deleteTargetWatchlist && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowDeleteModal(false); setDeleteTargetWatchlist(null) }}>
          <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-[#2a2e39] flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Remove Watchlist</h2>
              <button onClick={() => { setShowDeleteModal(false); setDeleteTargetWatchlist(null) }} className="text-[#787b86] hover:text-white">
                <X size={20} />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-3">
              <p className="text-sm text-[#d1d4dc]">Are you sure to remove <span className="font-semibold">{deleteTargetWatchlist.watchlist_name}</span>?</p>
            </div>
            {/* Footer */}
            <div className="p-5 border-t border-[#2a2e39] flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTargetWatchlist(null) }}
                className="px-6 py-2 bg-white text-[#131722] rounded-lg hover:bg-[#e6e6e6] transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => { 
                  if (deleteTargetWatchlist) {
                    await deleteWatchlist(deleteTargetWatchlist.id);
                    setShowDeleteModal(false);
                    setDeleteTargetWatchlist(null);
                  }
                }}
                className="px-6 py-2 bg-[#2962ff] text-white rounded-lg hover:bg-[#1e53e5] transition-colors font-medium text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME WATCHLIST MODAL */}
      {showRenameModal && renamingWatchlistId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowRenameModal(false); setRenamingWatchlistId(null) }}>
          <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-[#2a2e39] flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Edit Watchlist Name</h2>
              <button onClick={() => { setShowRenameModal(false); setRenamingWatchlistId(null) }} className="text-[#787b86] hover:text-white">
                <X size={20} />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-3">
              <label className="text-sm text-[#787b86]">Watchlist Name</label>
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    renameWatchlist(renamingWatchlistId!, renameValue)
                    setShowRenameModal(false)
                  }
                }}
                className="w-full bg-[#1e222d] border border-[#2a2e39] text-white px-4 py-3 rounded-lg outline-none focus:border-[#2962ff]"
                placeholder="Enter name"
                maxLength={50}
              />
            </div>
            {/* Footer */}
            <div className="p-5 border-t border-[#2a2e39] flex gap-3 justify-end">
              <button
                onClick={() => { setShowRenameModal(false); setRenamingWatchlistId(null) }}
                className="px-6 py-2 bg-[#2a2e39] text-white rounded-lg hover:bg-[#3a3e49] transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { renameWatchlist(renamingWatchlistId!, renameValue); setShowRenameModal(false) }}
                className="px-6 py-2 bg-[#2962ff] text-white rounded-lg hover:bg-[#1e53e5] transition-colors font-medium text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}