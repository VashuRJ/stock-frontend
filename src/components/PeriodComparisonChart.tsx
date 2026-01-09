import React, { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { X, Calendar, TrendingUp, BarChart3, ArrowLeftRight, Loader2, Zap } from 'lucide-react'
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

// Quick comparison presets - fills both period 1 and period 2
const QUICK_PRESETS = [
  { label: 'Q4 vs Q3 2025', p1: { start: '2025-10-01', end: '2025-12-31' }, p2: { start: '2025-07-01', end: '2025-09-30' } },
  { label: 'Jan 2025 vs Jan 2024', p1: { start: '2025-01-01', end: '2025-01-31' }, p2: { start: '2024-01-01', end: '2024-01-31' } },
  { label: '2025 vs 2024 (YTD)', p1: { start: '2025-01-01', end: '2025-12-31' }, p2: { start: '2024-01-01', end: '2024-12-31' } },
]

// Helper to format date
const formatDate = (date: Date): string => date.toISOString().split('T')[0]

export default function PeriodComparisonChart({ 
  symbol, 
  currentPeriod,
  onClose 
}: PeriodComparisonChartProps) {
  // Period 1 dates - User can freely edit
  const [period1Start, setPeriod1Start] = useState(currentPeriod.start)
  const [period1End, setPeriod1End] = useState(currentPeriod.end)
  
  // Period 2 dates - User can freely edit (default: 1 month earlier)
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
  React.useEffect(() => {
    handleCompare()
  }, [])

  // Apply quick preset
  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setPeriod1Start(preset.p1.start)
    setPeriod1End(preset.p1.end)
    setPeriod2Start(preset.p2.start)
    setPeriod2End(preset.p2.end)
  }

  // Build ECharts option
  const chartOption = useMemo(() => {
    if (!comparisonData || !comparisonData.period1 || !comparisonData.period2) {
      return {}
    }

    const p1 = comparisonData.period1
    const p2 = comparisonData.period2

    const maxDays = Math.max(p1.data.length, p2.data.length)
    const days = Array.from({ length: maxDays }, (_, i) => `Day ${i + 1}`)

    const period1Data = p1.data.map(d => chartMode === 'percent' ? d.change_pct : d.close)
    const period2Data = p2.data.map(d => chartMode === 'percent' ? d.change_pct : d.close)

    return {
      backgroundColor: '#131722',
      animation: true,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(19, 23, 34, 0.95)',
        borderColor: '#2a2e39',
        textStyle: { color: '#d1d4dc', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || params.length === 0) return ''
          const dayIndex = params[0].dataIndex
          
          let html = `<div style="font-weight:bold; margin-bottom:8px; color:#fff;">Day ${dayIndex + 1}</div>`
          
          params.forEach((p: any) => {
            const periodData = p.seriesName === p1.label ? p1.data[dayIndex] : p2.data[dayIndex]
            if (periodData) {
              const val = chartMode === 'percent' 
                ? `${p.value?.toFixed(2)}%` 
                : `₹${p.value?.toFixed(2)}`
              html += `
                <div style="display:flex; justify-content:space-between; gap:20px; margin:4px 0;">
                  <span style="color:${p.color}">● ${p.seriesName}</span>
                  <span style="font-family:monospace; color:#fff;">${val}</span>
                </div>
                <div style="font-size:10px; color:#787b86; margin-bottom:6px;">
                  ${periodData.date} • Close: ₹${periodData.close}
                </div>
              `
            }
          })
          return html
        }
      },
      legend: {
        data: [p1.label, p2.label],
        top: 10,
        textStyle: { color: '#787b86', fontSize: 11 },
        itemGap: 20,
      },
      grid: { left: 60, right: 20, top: 60, bottom: 40 },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: '#2a2e39' } },
        axisLabel: { color: '#787b86', fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { 
          color: '#787b86', 
          fontSize: 10,
          formatter: chartMode === 'percent' ? '{value}%' : '₹{value}'
        },
        splitLine: { lineStyle: { color: '#2a2e39', type: 'dashed' } },
      },
      series: [
        {
          name: p1.label,
          type: 'line',
          data: period1Data,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 2.5, color: '#2962ff' },
          itemStyle: { color: '#2962ff' },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(41, 98, 255, 0.3)' },
                { offset: 1, color: 'rgba(41, 98, 255, 0)' }
              ]
            }
          }
        },
        {
          name: p2.label,
          type: 'line',
          data: period2Data,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 2.5, color: '#ff9800' },
          itemStyle: { color: '#ff9800' },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 152, 0, 0.2)' },
                { offset: 1, color: 'rgba(255, 152, 0, 0)' }
              ]
            }
          }
        }
      ]
    }
  }, [comparisonData, chartMode])

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-[#131722] rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-[#2a2e39]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2e39]">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="text-[#2962ff]" size={20} />
            <div>
              <h2 className="text-lg font-bold text-white">Compare Time Periods</h2>
              <p className="text-xs text-[#787b86]">{symbol.replace('.NS', '')} • Select any two time periods to compare</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2a2e39] rounded-lg transition-colors text-[#787b86] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Period Selection - User selects BOTH periods manually */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Period 1 */}
            <div className="p-4 bg-[#1e222d] rounded-lg border-2 border-[#2962ff]/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-[#2962ff]"></div>
                <span className="text-sm font-bold text-[#2962ff]">Period 1 (Blue Line)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#787b86] mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={period1Start}
                    onChange={(e) => setPeriod1Start(e.target.value)}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white text-sm focus:border-[#2962ff] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#787b86] mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={period1End}
                    onChange={(e) => setPeriod1End(e.target.value)}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white text-sm focus:border-[#2962ff] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Period 2 */}
            <div className="p-4 bg-[#1e222d] rounded-lg border-2 border-[#ff9800]/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-[#ff9800]"></div>
                <span className="text-sm font-bold text-[#ff9800]">Period 2 (Orange Line)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#787b86] mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={period2Start}
                    onChange={(e) => setPeriod2Start(e.target.value)}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white text-sm focus:border-[#ff9800] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#787b86] mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={period2End}
                    onChange={(e) => setPeriod2End(e.target.value)}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white text-sm focus:border-[#ff9800] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Compare Button + Quick Presets */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleCompare}
              disabled={loading}
              className="px-6 py-2.5 bg-[#2962ff] text-white rounded-lg font-bold hover:bg-[#2962ff]/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
              {loading ? 'Comparing...' : 'Compare Periods'}
            </button>

            {/* Quick Presets */}
            <div className="flex-1 flex flex-wrap gap-2">
              <span className="text-xs text-[#787b86] flex items-center gap-1">
                <Zap size={12} /> Quick Fill:
              </span>
              {QUICK_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 text-[10px] bg-[#1e222d] text-[#787b86] hover:text-white rounded border border-[#2a2e39] hover:border-[#2962ff] transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-[#f23645]/10 border border-[#f23645]/30 rounded-lg text-[#f23645] text-sm">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-[#2962ff] mx-auto mb-3" />
                <p className="text-[#787b86] text-sm">Fetching comparison data...</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && comparisonData && comparisonData.period1 && comparisonData.period2 && (
            <>
              {/* Chart Mode Toggle */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#2962ff]" />
                  Performance Comparison
                </h3>
                <div className="flex gap-1 bg-[#1e222d] rounded p-1">
                  <button
                    onClick={() => setChartMode('percent')}
                    className={`px-3 py-1 text-xs rounded transition-all ${
                      chartMode === 'percent' ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-white'
                    }`}
                  >
                    % Change
                  </button>
                  <button
                    onClick={() => setChartMode('price')}
                    className={`px-3 py-1 text-xs rounded transition-all ${
                      chartMode === 'price' ? 'bg-[#2962ff] text-white' : 'text-[#787b86] hover:text-white'
                    }`}
                  >
                    Price
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-[#131722] rounded-lg border border-[#2a2e39] mb-4">
                <ReactECharts option={chartOption} style={{ height: '320px' }} />
              </div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <SummaryCard period={comparisonData.period1} color="#2962ff" label="Period 1" />
                <SummaryCard period={comparisonData.period2} color="#ff9800" label="Period 2" />
              </div>

              {/* Comparison Insights */}
              {comparisonData.comparison && (
                <div className="bg-gradient-to-r from-[#2962ff]/10 to-[#ff9800]/10 rounded-lg p-4 border border-[#2a2e39]">
                  <h4 className="text-sm font-semibold text-white mb-3">📊 Quick Insights</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-[#131722]/80 rounded-lg">
                      <p className="text-[10px] text-[#787b86] mb-1">Return Difference</p>
                      <p className={`text-lg font-bold font-mono ${
                        comparisonData.comparison.return_difference >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                      }`}>
                        {comparisonData.comparison.return_difference >= 0 ? '+' : ''}
                        {comparisonData.comparison.return_difference}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-[#131722]/80 rounded-lg">
                      <p className="text-[10px] text-[#787b86] mb-1">Winner</p>
                      <p className="text-lg font-bold">
                        {comparisonData.comparison.period1_better ? '🔵 Period 1' : '🟠 Period 2'}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-[#131722]/80 rounded-lg">
                      <p className="text-[10px] text-[#787b86] mb-1">Avg Price Change</p>
                      <p className={`text-lg font-bold font-mono ${
                        comparisonData.comparison.avg_price_change >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                      }`}>
                        {comparisonData.comparison.avg_price_change >= 0 ? '+' : ''}
                        {comparisonData.comparison.avg_price_change}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-[#131722]/80 rounded-lg">
                      <p className="text-[10px] text-[#787b86] mb-1">Volume Change</p>
                      <p className={`text-lg font-bold font-mono ${
                        comparisonData.comparison.volume_change_pct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'
                      }`}>
                        {comparisonData.comparison.volume_change_pct >= 0 ? '+' : ''}
                        {comparisonData.comparison.volume_change_pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* No Data */}
          {!loading && (!comparisonData || !comparisonData.period1 || !comparisonData.period2) && !error && (
            <div className="text-center py-10">
              <Calendar size={48} className="text-[#2a2e39] mx-auto mb-3" />
              <p className="text-[#787b86]">Select dates and click "Compare Periods" to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
