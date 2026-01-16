import React, { useState, useEffect, useRef } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineData,
  Time,
  CrosshairMode
} from 'lightweight-charts'
import { X, Calendar, TrendingUp, BarChart3, ArrowLeftRight, Loader2, Zap, Maximize2, Minimize2 } from 'lucide-react'
import {
  comparePeriods,
  PeriodCompareResponse,
  PeriodCompareRequest,
  PeriodData
} from '@/api/client'

interface PeriodComparisonChartProps {
  symbol: string
  currentPeriod: { start: string; end: string }
  onClose: () => void
}

// Quick comparison presets
const QUICK_PRESETS = [
  { label: 'Q4 vs Q3 2025', p1: { start: '2025-10-01', end: '2025-12-31' }, p2: { start: '2025-07-01', end: '2025-09-30' } },
  { label: 'Jan 2025 vs Jan 2024', p1: { start: '2025-01-01', end: '2025-01-31' }, p2: { start: '2024-01-01', end: '2024-01-31' } },
  { label: '2025 vs 2024 (YTD)', p1: { start: '2025-01-01', end: '2025-12-31' }, p2: { start: '2024-01-01', end: '2024-12-31' } },
]

const formatDate = (date: Date): string => date.toISOString().split('T')[0]

export default function PeriodComparisonChart({
  symbol,
  currentPeriod,
  onClose
}: PeriodComparisonChartProps) {
  const [period1Start, setPeriod1Start] = useState(currentPeriod.start)
  const [period1End, setPeriod1End] = useState(currentPeriod.end)
  const [period2Start, setPeriod2Start] = useState(() => {
    const start = new Date(currentPeriod.start)
    start.setMonth(start.getMonth() - 1)
    return formatDate(start)
  })
  const [period2End, setPeriod2End] = useState(() => {
    const end = new Date(currentPeriod.end)
    end.setMonth(end.getMonth() - 1)
    return formatDate(end)
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comparisonData, setComparisonData] = useState<PeriodCompareResponse | null>(null)
  const [chartMode, setChartMode] = useState<'price' | 'percent'>('percent')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const period1SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const period2SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  // Fetch comparison
  const handleCompare = async () => {
    if (!period1Start || !period1End || !period2Start || !period2End) {
      setError('Please select all dates')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const request: PeriodCompareRequest = {
        symbol,
        period1: {
          start_date: period1Start,
          end_date: period1End,
        },
        period2: {
          start_date: period2Start,
          end_date: period2End,
        },
        normalize: true,
      }

      const data = await comparePeriods(request)
      setComparisonData(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to fetch comparison data')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    handleCompare()
  }, [])

  // Apply quick preset
  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setPeriod1Start(preset.p1.start)
    setPeriod1End(preset.p1.end)
    setPeriod2Start(preset.p2.start)
    setPeriod2End(preset.p2.end)
  }

  // Initialize chart ONLY when data is available
  useEffect(() => {
    if (!chartContainerRef.current || !comparisonData?.period1 || !comparisonData?.period2) {
      return
    }

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      period1SeriesRef.current = null
      period2SeriesRef.current = null
    }

    const container = chartContainerRef.current
    const { width, height } = container.getBoundingClientRect()

    if (width === 0 || height === 0) {
      console.error('Container has zero dimensions')
      return
    }

    // Create tooltip element
    const tooltip = document.createElement('div')
    tooltip.className = 'absolute pointer-events-none z-10 bg-[#1e222d] border border-[#2a2e39] rounded-lg p-2 text-xs text-white shadow-xl'
    tooltip.style.display = 'none'
    container.appendChild(tooltip)

    // Create chart with enhanced options
    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2e39', style: 1, visible: true },
        horzLines: { color: '#2a2e39', style: 1, visible: true },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#9598A1',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2962ff',
        },
        horzLine: {
          color: '#9598A1',
          width: 1,
          style: 3,
          labelBackgroundColor: '#2962ff',
        },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: false, // Allow manual vertical panning
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 10,
        fixLeftEdge: false, // Allow scrolling beyond edges
        fixRightEdge: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
        mouseWheel: true,
        pinch: true,
      },
    })

    chartRef.current = chart

    // Add series with enhanced styling
    const period1Series = chart.addSeries(LineSeries, {
      color: '#2962ff',
      lineWidth: 3,
      title: comparisonData.period1.label,
      lastValueVisible: true,
      priceLineVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lineStyle: 0, // Solid
    })
    period1SeriesRef.current = period1Series

    const period2Series = chart.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 3,
      title: comparisonData.period2.label,
      lastValueVisible: true,
      priceLineVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lineStyle: 0, // Solid
    })
    period2SeriesRef.current = period2Series

    // Process and set data with proper timestamps
    const p1 = comparisonData.period1
    const p2 = comparisonData.period2

    // Use normalized day indices as timestamps (converted to UTC format)
    const period1Data: LineData<Time>[] = p1.data.map((d, i) => {
      const value = chartMode === 'percent' ? d.change_pct : d.close
      return {
        time: ((i + 1) * 86400) as Time, // Day index in seconds
        value: value,
      }
    }).filter(d => typeof d.value === 'number' && !isNaN(d.value)) as LineData<Time>[]

    const period2Data: LineData<Time>[] = p2.data.map((d, i) => {
      const value = chartMode === 'percent' ? d.change_pct : d.close
      return {
        time: ((i + 1) * 86400) as Time, // Day index in seconds
        value: value,
      }
    }).filter(d => typeof d.value === 'number' && !isNaN(d.value)) as LineData<Time>[]

    console.log('Setting chart data:', {
      period1Length: period1Data.length,
      period2Length: period2Data.length,
      period1Sample: period1Data.slice(0, 3),
      period2Sample: period2Data.slice(0, 3),
    })

    period1Series.setData(period1Data)
    period2Series.setData(period2Data)

    chart.timeScale().fitContent()

    // Custom tooltip on crosshair move
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        tooltip.style.display = 'none'
        return
      }

      const dayIndex = Math.floor((param.time as number) / 86400)
      const dataIndex = dayIndex - 1

      if (dataIndex < 0 || dataIndex >= Math.max(p1.data.length, p2.data.length)) {
        tooltip.style.display = 'none'
        return
      }

      const p1Data = p1.data[dataIndex]
      const p2Data = p2.data[dataIndex]

      let tooltipHTML = `<div class="font-bold mb-1">Day ${dayIndex}</div>`

      if (p1Data) {
        const p1Value = chartMode === 'percent' ? p1Data.change_pct : p1Data.close
        if (p1Value !== null && p1Value !== undefined) {
          tooltipHTML += `
            <div class="flex items-center gap-2 mb-1">
              <div class="w-2 h-2 rounded-full bg-[#2962ff]"></div>
              <span class="text-[#2962ff] font-semibold">${comparisonData.period1?.label || 'Period 1'}</span>
            </div>
            <div class="ml-4 mb-2">
              <div class="text-[#787b86]">${p1Data.date}</div>
              <div class="text-white font-mono">${chartMode === 'percent' ? p1Value.toFixed(2) + '%' : '₹' + p1Value.toFixed(2)}</div>
            </div>
          `
        }
      }

      if (p2Data) {
        const p2Value = chartMode === 'percent' ? p2Data.change_pct : p2Data.close
        if (p2Value !== null && p2Value !== undefined) {
          tooltipHTML += `
            <div class="flex items-center gap-2 mb-1">
              <div class="w-2 h-2 rounded-full bg-[#ff9800]"></div>
              <span class="text-[#ff9800] font-semibold">${comparisonData.period2?.label || 'Period 2'}</span>
            </div>
            <div class="ml-4">
              <div class="text-[#787b86]">${p2Data.date}</div>
              <div class="text-white font-mono">${chartMode === 'percent' ? p2Value.toFixed(2) + '%' : '₹' + p2Value.toFixed(2)}</div>
            </div>
          `
        }
      }

      tooltip.innerHTML = tooltipHTML
      tooltip.style.display = 'block'

      // Position tooltip
      const tooltipWidth = 200
      const tooltipHeight = tooltip.offsetHeight
      const padding = 10

      let left = param.point.x + padding
      let top = param.point.y + padding

      if (left + tooltipWidth > width) {
        left = param.point.x - tooltipWidth - padding
      }
      if (top + tooltipHeight > height) {
        top = param.point.y - tooltipHeight - padding
      }

      tooltip.style.left = left + 'px'
      tooltip.style.top = top + 'px'
    })

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect()
      chart.applyOptions({ width, height })
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      tooltip.remove()
      chart.remove()
      chartRef.current = null
    }
  }, [comparisonData, chartMode])

  // Reset zoom
  const handleResetZoom = () => {
    chartRef.current?.timeScale().fitContent()
  }

  // Summary Card
  const SummaryCard = ({ period, color, label }: { period: PeriodData; color: string; label: string }) => (
    <div className="bg-[#1e222d] rounded-lg p-4 border border-[#2a2e39]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      <p className="text-xs text-[#787b86] mb-2">{period.label}</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[#787b86]">Return</span>
          <p className={`font-mono font-bold ${period.summary.period_return_pct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
            {period.summary.period_return_pct >= 0 ? '+' : ''}{period.summary.period_return_pct}%
          </p>
        </div>
        <div>
          <span className="text-[#787b86]">Trading Days</span>
          <p className="font-mono text-white">{period.summary.total_days}</p>
        </div>
        <div>
          <span className="text-[#787b86]">Start</span>
          <p className="font-mono text-white">₹{period.summary.start_price}</p>
        </div>
        <div>
          <span className="text-[#787b86]">End</span>
          <p className="font-mono text-white">₹{period.summary.end_price}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center ${isFullscreen ? '' : 'p-4'}`}>
      <div className={`bg-[#131722] rounded-xl ${isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-6xl max-h-[90vh]'} overflow-hidden shadow-2xl border border-[#2a2e39] transition-all`}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isFullscreen ? 'p-2 border-b border-[#2a2e39]' : 'p-4 border-b border-[#2a2e39]'}`}>
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="text-[#2962ff]" size={isFullscreen ? 16 : 20} />
            <div>
              <h2 className={`${isFullscreen ? 'text-base' : 'text-lg'} font-bold text-white`}>Compare Time Periods (TradingView Style)</h2>
              <p className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-[#787b86]`}>{symbol.replace('.NS', '')} • Drag anywhere to pan, wheel to zoom, axis to scale</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-[#2a2e39] rounded-lg transition-colors text-[#787b86] hover:text-white"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[#2a2e39] rounded-lg transition-colors text-[#787b86] hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={`${isFullscreen ? 'p-2' : 'p-4'} overflow-y-auto`} style={{ maxHeight: isFullscreen ? 'calc(100vh - 60px)' : 'calc(90vh - 80px)' }}>
          {/* Period Selection - Compact in fullscreen */}
          <div className={`grid md:grid-cols-2 gap-3 mb-3 ${isFullscreen ? 'md:grid-cols-4' : ''}`}>
            <div className={`${isFullscreen ? 'p-1.5' : 'p-3'} bg-[#1e222d] rounded-lg border-2 border-[#2962ff]/50`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#2962ff]"></div>
                <span className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} font-bold text-[#2962ff]`}>Period 1</span>
              </div>
              <div className="flex gap-2">
                <input type="date" value={period1Start} onChange={(e) => setPeriod1Start(e.target.value)}
                  className={`flex-1 bg-[#131722] border border-[#2a2e39] rounded px-2 ${isFullscreen ? 'py-1 text-xs' : 'py-2 text-sm'} text-white focus:border-[#2962ff] outline-none`} />
              </div>
            </div>

            <div className={`${isFullscreen ? 'p-1.5' : 'p-3'} bg-[#1e222d] rounded-lg border-2 border-[#2962ff]/50`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#2962ff]"></div>
                <span className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} font-bold text-[#2962ff]`}>to</span>
              </div>
              <div className="flex gap-2">
                <input type="date" value={period1End} onChange={(e) => setPeriod1End(e.target.value)}
                  className={`flex-1 bg-[#131722] border border-[#2a2e39] rounded px-2 ${isFullscreen ? 'py-1 text-xs' : 'py-2 text-sm'} text-white focus:border-[#2962ff] outline-none`} />
              </div>
            </div>

            <div className={`${isFullscreen ? 'p-1.5' : 'p-3'} bg-[#1e222d] rounded-lg border-2 border-[#ff9800]/50`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#ff9800]"></div>
                <span className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} font-bold text-[#ff9800]`}>Period 2</span>
              </div>
              <div className="flex gap-2">
                <input type="date" value={period2Start} onChange={(e) => setPeriod2Start(e.target.value)}
                  className={`flex-1 bg-[#131722] border border-[#2a2e39] rounded px-2 ${isFullscreen ? 'py-1 text-xs' : 'py-2 text-sm'} text-white focus:border-[#ff9800] outline-none`} />
              </div>
            </div>

            <div className={`${isFullscreen ? 'p-1.5' : 'p-3'} bg-[#1e222d] rounded-lg border-2 border-[#ff9800]/50`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#ff9800]"></div>
                <span className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} font-bold text-[#ff9800]`}>to</span>
              </div>
              <div className="flex gap-2">
                <input type="date" value={period2End} onChange={(e) => setPeriod2End(e.target.value)}
                  className={`flex-1 bg-[#131722] border border-[#2a2e39] rounded px-2 ${isFullscreen ? 'py-1 text-xs' : 'py-2 text-sm'} text-white focus:border-[#ff9800] outline-none`} />
              </div>
            </div>
          </div>

          {/* Compare Button + Quick Presets */}
          {!isFullscreen && (
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <button onClick={handleCompare} disabled={loading}
                className="px-6 py-2.5 bg-[#2962ff] text-white rounded-lg font-bold hover:bg-[#2962ff]/80 disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                {loading ? 'Comparing...' : 'Compare'}
              </button>
              <div className="flex-1 flex flex-wrap gap-2">
                <span className="text-xs text-[#787b86] flex items-center gap-1"><Zap size={12} /> Quick:</span>
                {QUICK_PRESETS.map((preset, i) => (
                  <button key={i} onClick={() => applyPreset(preset)}
                    className="px-2 py-1 text-[10px] bg-[#1e222d] text-[#787b86] hover:text-white rounded border border-[#2a2e39] hover:border-[#2962ff]">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className={`${isFullscreen ? 'mb-2 p-2' : 'mb-4 p-3'} bg-[#f23645]/10 border border-[#f23645]/30 rounded-lg text-[#f23645] ${isFullscreen ? 'text-xs' : 'text-sm'}`}>{error}</div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-[#2962ff] mx-auto mb-3" />
                <p className="text-[#787b86] text-sm">Fetching comparison data...</p>
              </div>
            </div>
          )}

          {!loading && comparisonData && comparisonData.period1 && comparisonData.period2 && (
            <>
              <div className={`flex justify-between items-center ${isFullscreen ? 'mb-1.5' : 'mb-3'}`}>
                <div className="flex items-center gap-2">
                  <h3 className={`${isFullscreen ? 'text-xs' : 'text-sm'} font-semibold text-white flex items-center gap-2`}>
                    <TrendingUp size={isFullscreen ? 12 : 16} className="text-[#2962ff]" />
                    {isFullscreen ? 'Chart' : 'Performance Comparison'}
                  </h3>
                  {isFullscreen && (
                    <button onClick={handleCompare} disabled={loading}
                      className="px-3 py-1 text-xs bg-[#2962ff] text-white rounded-lg font-bold hover:bg-[#2962ff]/80 disabled:opacity-50 flex items-center gap-1">
                      {loading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                      {loading ? 'Comparing...' : 'Compare'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="flex gap-1 bg-[#1e222d] rounded p-1">
                    <button onClick={() => setChartMode('percent')}
                      className={`${isFullscreen ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} rounded ${chartMode === 'percent' ? 'bg-[#2962ff] text-white' : 'text-[#787b86]'}`}>
                      % Change
                    </button>
                    <button onClick={() => setChartMode('price')}
                      className={`${isFullscreen ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} rounded ${chartMode === 'price' ? 'bg-[#2962ff] text-white' : 'text-[#787b86]'}`}>
                      Price
                    </button>
                  </div>
                  <button onClick={handleResetZoom}
                    className={`${isFullscreen ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} rounded bg-[#1e222d] text-[#787b86] hover:text-white border border-[#2a2e39]`}>
                    ⟲ Reset
                  </button>
                </div>
              </div>

              <div className={`bg-[#131722] rounded-lg border border-[#2a2e39] ${isFullscreen ? 'mb-2' : 'mb-4'} relative ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[400px]'}`}>
                <div ref={chartContainerRef} className="w-full h-full" />
                <div className="absolute top-2 left-2 flex gap-3 text-xs bg-[#131722]/80 px-2 py-1 rounded">
                  <span className="text-[#2962ff]">● {comparisonData.period1.label}</span>
                  <span className="text-[#ff9800]">● {comparisonData.period2.label}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <SummaryCard period={comparisonData.period1} color="#2962ff" label="Period 1" />
                <SummaryCard period={comparisonData.period2} color="#ff9800" label="Period 2" />
              </div>

              {comparisonData.comparison && (
                <div className="bg-gradient-to-r from-[#2962ff]/10 to-[#ff9800]/10 rounded-lg p-4 border border-[#2a2e39]">
                  <h4 className="text-sm font-semibold text-white mb-3">📊 Quick Insights</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-[#131722]/80 rounded-lg">
                      <p className="text-[10px] text-[#787b86] mb-1">Return Difference</p>
                      <p className={`text-lg font-bold font-mono ${comparisonData.comparison.return_difference >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {comparisonData.comparison.return_difference >= 0 ? '+' : ''}{comparisonData.comparison.return_difference}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-[#131722]/80 rounded-lg">
                      <p className="text-[10px] text-[#787b86] mb-1">Winner</p>
                      <p className="text-lg font-bold">{comparisonData.comparison.period1_better ? '🔵 Period 1' : '🟠 Period 2'}</p>
                    </div>
                    <div className="text-center p-3 bg-[#131722]/80 rounded-lg">
                      <p className="text-[10px] text-[#787b86] mb-1">Avg Price Change</p>
                      <p className={`text-lg font-bold font-mono ${comparisonData.comparison.avg_price_change >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {comparisonData.comparison.avg_price_change >= 0 ? '+' : ''}{comparisonData.comparison.avg_price_change}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-[#131722]/80 rounded-lg">
                      <p className="text-[10px] text-[#787b86] mb-1">Volume Change</p>
                      <p className={`text-lg font-bold font-mono ${comparisonData.comparison.volume_change_pct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {comparisonData.comparison.volume_change_pct >= 0 ? '+' : ''}{comparisonData.comparison.volume_change_pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && (!comparisonData || !comparisonData.period1 || !comparisonData.period2) && !error && (
            <div className="text-center py-10">
              <Calendar size={48} className="text-[#2a2e39] mx-auto mb-3" />
              <p className="text-[#787b86]">Select dates and click "Compare Periods"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
