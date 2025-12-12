import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// --- 1. HERO CHART COMPONENT (Visual Masterpiece) ---
// Ye component ek fake trading interface banata hai jo real lagta hai
const HeroChart = () => {
  const [candles, setCandles] = useState<any[]>([])
  
  useEffect(() => {
    // Initial Data Generation (Fake Candles)
    const data = []
    let price = 15000
    for (let i = 0; i < 40; i++) {
      const move = (Math.random() - 0.5) * 150
      const open = price
      const close = price + move
      const high = Math.max(open, close) + Math.random() * 50
      const low = Math.min(open, close) - Math.random() * 50
      price = close
      data.push({ open, close, high, low })
    }
    setCandles(data)

    // Live Ticker Animation Effect
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1]
        const move = (Math.random() - 0.5) * 80
        const newClose = last.close + move
        const newCandle = {
          open: last.close,
          close: newClose,
          high: Math.max(last.close, newClose) + Math.random() * 20,
          low: Math.min(last.close, newClose) - Math.random() * 20
        }
        return [...prev.slice(1), newCandle]
      })
    }, 800) // Fast updates

    return () => clearInterval(interval)
  }, [])

  // Calculate Scale for CSS
  const maxPrice = Math.max(...candles.map(c => c.high), 16000)
  const minPrice = Math.min(...candles.map(c => c.low), 14000)
  const range = maxPrice - minPrice || 1

  return (
    <div className="w-full h-full bg-[#131722] rounded-xl border border-[#2a2e39] overflow-hidden shadow-2xl relative flex flex-col">
      {/* Fake Header Bar */}
      <div className="h-10 border-b border-[#2a2e39] flex items-center px-4 gap-4 bg-[#1e222d]">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-[#2962ff] rounded flex items-center justify-center text-xs font-bold text-white">N</span>
          <span className="font-bold text-white text-sm">NIFTY 50</span>
        </div>
        <div className="h-4 w-[1px] bg-[#2a2e39]"></div>
        <div className="flex gap-3 text-xs font-medium text-[#787b86]">
          <span className="text-[#2962ff]">15m</span>
          <span>1h</span>
          <span>4h</span>
          <span>D</span>
        </div>
        <div className="ml-auto text-[#2962ff] text-xs font-bold animate-pulse">● LIVE</div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative p-4 flex items-end justify-between gap-1 overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#2a2e39 1px, transparent 1px), linear-gradient(90deg, #2a2e39 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>

        {/* Candles Rendering */}
        {candles.map((c, i) => {
          const isGreen = c.close >= c.open
          const color = isGreen ? '#089981' : '#f23645'
          const heightPct = Math.abs(c.close - c.open) / range * 100
          const wickHeightPct = (c.high - c.low) / range * 100
          const bottomPct = (Math.min(c.open, c.close) - minPrice) / range * 100
          const wickBottomPct = (c.low - minPrice) / range * 100

          return (
            <div key={i} className="relative flex-1 h-full group hover:opacity-100 opacity-90 transition-all">
              {/* Wick */}
              <div 
                className="absolute w-[1px] left-1/2 -translate-x-1/2"
                style={{ height: `${wickHeightPct}%`, bottom: `${wickBottomPct}%`, backgroundColor: color }}
              ></div>
              {/* Body */}
              <div 
                className="absolute w-full"
                style={{ height: `${Math.max(heightPct, 1)}%`, bottom: `${bottomPct}%`, backgroundColor: color }}
              ></div>
            </div>
          )
        })}

        {/* Current Price Line */}
        <div className="absolute right-0 w-full border-t border-dashed border-[#2962ff]/50 flex items-center justify-end" style={{ bottom: '50%' }}>
          <span className="bg-[#2962ff] text-white text-[10px] px-1 rounded-l">15,450.20</span>
        </div>
      </div>
    </div>
  )
}

// --- MAIN HOME PAGE ---
export default function Home() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) setIsLoggedIn(true)
  }, [])

  const handleRestrictedAction = (e: any) => {
    if (e && e.stopPropagation) e.stopPropagation(); 
    if (isLoggedIn) navigate('/dashboard')
    else navigate('/login') 
  }

  // --- MOCK DATA ---
  const INDICES = [
    { name: 'NIFTY 50', price: '22,208.95', pChange: 0.45, isPos: true },
    { name: 'BANK NIFTY', price: '47,123.40', pChange: -0.12, isPos: false },
    { name: 'SENSEX', price: '73,754.30', pChange: 0.22, isPos: true },
    { name: 'NIFTY IT', price: '35,450.10', pChange: -0.34, isPos: false },
  ]

  const WATCHLIST = [
    { s: 'RELIANCE', n: 'Reliance Ind.', p: '2,940.00', chg: '+1.20%', isPos: true },
    { s: 'TCS', n: 'Tata Consultancy', p: '4,150.00', chg: '-0.50%', isPos: false },
    { s: 'HDFCBANK', n: 'HDFC Bank', p: '1,450.00', chg: '+0.80%', isPos: true },
    { s: 'SBIN', n: 'State Bank India', p: '760.00', chg: '+2.10%', isPos: true },
  ]

  return (
    <div className="min-h-screen bg-[#0e1117] text-[#d1d4dc] font-sans selection:bg-[#2962ff] selection:text-white">
      
      {/* 1. TICKER TAPE (Top Bar) */}
      <div className="bg-[#131722] border-b border-[#2a2e39] overflow-hidden whitespace-nowrap py-2">
        <div className="animate-scroll inline-block min-w-full">
          {[...INDICES, ...INDICES, ...INDICES].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 mx-6 text-xs font-medium">
              <span className="text-[#9ca3af]">{item.name}</span>
              <span className="text-white">{item.price}</span>
              <span className={item.isPos ? 'text-[#089981]' : 'text-[#f23645]'}>{item.pChange}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* 2. HERO SECTION (Main Focus) */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* LEFT: Text Content */}
          <div className="text-left space-y-8 relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight">
              Master the Markets <br />
              <span className="bg-gradient-to-r from-[#2962ff] to-[#00b4ff] bg-clip-text text-transparent">
                With Precision.
              </span>
            </h1>
            
            <p className="text-lg text-[#787b86] max-w-xl font-light leading-relaxed">
              Advanced charting, real-time data, and algorithmic insights—all in one place. 
              Designed for traders who demand excellence.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={handleRestrictedAction}
                className="px-8 py-4 bg-[#2962ff] hover:bg-[#1e53e5] text-white rounded-full font-semibold text-lg transition-all shadow-[0_4px_20px_rgba(41,98,255,0.4)] hover:translate-y-[-2px]"
              >
                {isLoggedIn ? 'Launch Dashboard' : 'Start Trading Free'}
              </button>
              <button 
                onClick={() => document.getElementById('market-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-[#1e222d] hover:bg-[#2a2e39] text-white border border-[#2a2e39] rounded-full font-semibold text-lg transition-all"
              >
                Explore Market Data
              </button>
            </div>

            <div className="flex items-center gap-8 pt-8 opacity-70">
              <div>
                <p className="text-2xl font-bold text-white">50M+</p>
                <p className="text-xs text-[#787b86] uppercase tracking-wider">Data Points</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0ms</p>
                <p className="text-xs text-[#787b86] uppercase tracking-wider">Latency</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">24/7</p>
                <p className="text-xs text-[#787b86] uppercase tracking-wider">Market Access</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Hero Chart (The Visual Hook) */}
          <div className="relative h-[500px] w-full">
            {/* Glow Effect behind chart */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#2962ff] opacity-20 blur-[100px] rounded-full pointer-events-none"></div>
            
            {/* Actual Chart Component */}
            <HeroChart />

            {/* Floating Info Cards (For MNC Look) */}
            <div className="absolute -right-6 top-10 bg-[#1e222d] p-4 rounded-lg border border-[#2a2e39] shadow-xl animate-bounce-slow hidden xl:block">
              <p className="text-xs text-[#787b86] mb-1">Market Sentiment</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-[#2a2e39] rounded-full overflow-hidden">
                  <div className="h-full w-[70%] bg-[#089981]"></div>
                </div>
                <span className="text-[#089981] text-xs font-bold">Bullish</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. MARKET OVERVIEW SECTION */}
      <section id="market-grid" className="py-20 bg-[#131722]/50 border-t border-[#2a2e39]">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white">Market Pulse</h2>
              <p className="text-[#787b86] mt-2">Track the most active stocks and indices in real-time.</p>
            </div>
            <button onClick={handleRestrictedAction} className="text-[#2962ff] hover:text-white font-medium transition-colors">
              View All Markets →
            </button>
          </div>

          {/* Grid of Stocks */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WATCHLIST.map((stock, i) => (
              <div 
                key={i}
                onClick={handleRestrictedAction}
                className="bg-[#1e222d] border border-[#2a2e39] p-5 rounded-xl hover:border-[#2962ff] hover:shadow-[0_0_20px_rgba(41,98,255,0.15)] transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2a2e39] flex items-center justify-center text-white font-bold text-sm border border-[#2a2e39] group-hover:bg-[#2962ff] transition-colors">
                      {stock.s[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{stock.s}</h3>
                      <p className="text-xs text-[#787b86]">{stock.n}</p>
                    </div>
                  </div>
                  <button className="text-[#2962ff] opacity-0 group-hover:opacity-100 transition-opacity text-xl">+</button>
                </div>
                
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-mono text-white">₹{stock.p}</span>
                  <span className={`text-sm font-medium ${stock.isPos ? 'text-[#089981] bg-[#089981]/10' : 'text-[#f23645] bg-[#f23645]/10'} px-2 py-1 rounded`}>
                    {stock.chg}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
    </div>
  )
}