import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
    createChart,
    IChartApi,
    ISeriesApi,
    LineSeries,
    LineData,
    Time,
    CrosshairMode
} from 'lightweight-charts'
import {
    X, Calendar, TrendingUp, BarChart3, ArrowLeftRight,
    Loader2, Maximize2, Minimize2, Clock, CalendarDays,
    ChevronRight, Info, Zap, RotateCcw
} from 'lucide-react'
import {
    comparePeriods,
    PeriodCompareResponse,
    PeriodCompareRequest,
    PeriodData
} from '@/api/client'

interface SmartPeriodCompareProps {
    symbol: string
    onClose: () => void
}

// Duration presets in days
const DURATION_PRESETS = [
    { label: '1W', days: 7, description: '1 Week' },
    { label: '2W', days: 14, description: '2 Weeks' },
    { label: '1M', days: 30, description: '1 Month' },
    { label: '2M', days: 60, description: '2 Months' },
    { label: '3M', days: 90, description: '3 Months' },
    { label: '6M', days: 180, description: '6 Months' },
]

// Maximum allowed days (10 years max for safety)
const MAX_DAYS = 3650

// Safe format date to YYYY-MM-DD (handles invalid dates)
const formatDateForInput = (date: Date): string => {
    try {
        if (!date || isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0]
        }
        return date.toISOString().split('T')[0]
    } catch {
        return new Date().toISOString().split('T')[0]
    }
}

// Format date for display
const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

// Get today's date string for max date validation
const getTodayString = (): string => {
    return formatDateForInput(new Date())
}

// Calculate end date based on start date and duration (respects today's date)
const calculateEndDate = (startDate: string, days: number): { endDate: string; isPartial: boolean; actualDays: number } => {
    try {
        // Clamp days to valid range
        const safeDays = Math.min(Math.max(1, days), MAX_DAYS)

        const start = new Date(startDate)

        // Check if start date is valid
        if (isNaN(start.getTime())) {
            const today = new Date()
            return {
                endDate: formatDateForInput(today),
                isPartial: true,
                actualDays: 0
            }
        }

        const calculatedEnd = new Date(start)
        calculatedEnd.setDate(start.getDate() + safeDays - 1) // -1 because start date counts as day 1

        const today = new Date()
        today.setHours(23, 59, 59, 999) // End of today

        // If start date is in future, return invalid
        if (start > today) {
            return {
                endDate: formatDateForInput(start),
                isPartial: true,
                actualDays: 0
            }
        }

        if (calculatedEnd > today) {
            // Partial data - ends at today
            const actualDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
            return {
                endDate: formatDateForInput(today),
                isPartial: true,
                actualDays: Math.max(1, actualDays)
            }
        }

        return {
            endDate: formatDateForInput(calculatedEnd),
            isPartial: false,
            actualDays: safeDays
        }
    } catch {
        // Fallback on any error
        const today = new Date()
        return {
            endDate: formatDateForInput(today),
            isPartial: true,
            actualDays: 0
        }
    }
}

export default function SmartPeriodCompare({ symbol, onClose }: SmartPeriodCompareProps) {
    // ===== STATE =====
    const [step, setStep] = useState<1 | 2>(1) // Step 1: Duration, Step 2: Dates
    const [selectedDuration, setSelectedDuration] = useState<number>(30) // Default 1 month
    const [customDays, setCustomDays] = useState<string>('')

    // Date states
    const [date1, setDate1] = useState<string>(() => {
        // Default: 1 month ago
        const d = new Date()
        d.setMonth(d.getMonth() - 2)
        return formatDateForInput(d)
    })
    const [date2, setDate2] = useState<string>(() => {
        // Default: 1 month ago from today
        const d = new Date()
        d.setMonth(d.getMonth() - 1)
        return formatDateForInput(d)
    })

    // Comparison states
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [comparisonData, setComparisonData] = useState<PeriodCompareResponse | null>(null)
    const [chartMode, setChartMode] = useState<'percent' | 'price'>('percent')
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Chart refs
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const period1SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const period2SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

    // ===== COMPUTED VALUES =====
    // Clamp activeDays to valid range
    const activeDays = Math.min(
        Math.max(1, customDays ? parseInt(customDays) || 30 : selectedDuration),
        MAX_DAYS
    )

    const period1Info = useMemo(() => {
        return calculateEndDate(date1, activeDays)
    }, [date1, activeDays])

    const period2Info = useMemo(() => {
        return calculateEndDate(date2, activeDays)
    }, [date2, activeDays])

    // ===== HANDLERS =====
    const handleDurationSelect = (days: number) => {
        setSelectedDuration(days)
        setCustomDays('')
    }

    const handleCustomDaysChange = (value: string) => {
        // Only allow valid numbers up to MAX_DAYS
        const numValue = parseInt(value)
        if (value === '' || (numValue >= 1 && numValue <= MAX_DAYS)) {
            setCustomDays(value)
            if (numValue >= 1) {
                setSelectedDuration(0)
            }
        } else if (numValue > MAX_DAYS) {
            // Auto-correct to max
            setCustomDays(MAX_DAYS.toString())
            setSelectedDuration(0)
        }
    }

    const handleCompare = async () => {
        if (!date1 || !date2) {
            setError('Please select both start dates')
            return
        }

        // Validate dates are not the same
        if (date1 === date2) {
            setError('Please select different start dates for both periods. Comparing identical periods is not meaningful.')
            return
        }

        // Validate dates are not in future
        const today = new Date()
        today.setHours(23, 59, 59, 999)

        if (new Date(date1) > today) {
            setError('Date Range A start date cannot be in the future')
            return
        }

        if (new Date(date2) > today) {
            setError('Date Range B start date cannot be in the future')
            return
        }

        // Validate we have at least some data days
        if (period1Info.actualDays < 1) {
            setError('Date Range A has no valid trading days. Please select an earlier start date.')
            return
        }

        if (period2Info.actualDays < 1) {
            setError('Date Range B has no valid trading days. Please select an earlier start date.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const request: PeriodCompareRequest = {
                symbol,
                period1: {
                    start_date: date1,
                    end_date: period1Info.endDate,
                },
                period2: {
                    start_date: date2,
                    end_date: period2Info.endDate,
                },
                normalize: true,
            }

            const data = await comparePeriods(request)

            // Validate response has data
            if (!data.period1?.data?.length) {
                setError(`No data found for Date Range A (${formatDateDisplay(date1)} - ${formatDateDisplay(period1Info.endDate)}). The database may not have historical data for this date range.`)
                return
            }

            if (!data.period2?.data?.length) {
                setError(`No data found for Date Range B (${formatDateDisplay(date2)} - ${formatDateDisplay(period2Info.endDate)}). The database may not have historical data for this date range.`)
                return
            }

            setComparisonData(data)
            setStep(2) // Move to chart view
        } catch (err: any) {
            const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to fetch comparison data'

            // Provide more helpful error messages
            if (errorMsg.includes('No data found')) {
                setError(`${errorMsg}. Please ensure the database has historical data for the selected stock and date range.`)
            } else if (errorMsg.includes('Network')) {
                setError('Network error. Please check your internet connection and try again.')
            } else {
                setError(errorMsg)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleReset = () => {
        setComparisonData(null)
        setStep(1)
        setError(null)
    }

    // ===== CHART INITIALIZATION =====
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

        if (width === 0 || height === 0) return

        // Create tooltip
        const tooltip = document.createElement('div')
        tooltip.className = 'absolute pointer-events-none z-50 bg-[#1e222d]/95 backdrop-blur-sm border border-[#2a2e39] rounded-xl p-3 text-xs text-white shadow-2xl'
        tooltip.style.display = 'none'
        tooltip.style.minWidth = '220px'
        container.appendChild(tooltip)

        // Create chart
        const chart = createChart(container, {
            width,
            height,
            layout: {
                background: { color: '#0d1117' },
                textColor: '#8b949e',
                fontFamily: "'Inter', sans-serif",
            },
            grid: {
                vertLines: { color: '#21262d', style: 1 },
                horzLines: { color: '#21262d', style: 1 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: '#58a6ff',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#1f6feb',
                },
                horzLine: {
                    color: '#58a6ff',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#1f6feb',
                },
            },
            rightPriceScale: {
                borderColor: '#21262d',
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderColor: '#21262d',
                timeVisible: false, // We'll show day numbers
                rightOffset: 5,
                barSpacing: 12,
                fixLeftEdge: false,
                fixRightEdge: false,
                tickMarkFormatter: (time: Time) => {
                    const dayNum = Math.floor((time as number) / 86400)
                    return `Day ${dayNum}`
                },
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

        // Date Range A series (Blue)
        const period1Series = chart.addSeries(LineSeries, {
            color: '#58a6ff',
            lineWidth: 3,
            title: 'Date Range A',
            lastValueVisible: true,
            priceLineVisible: true,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 5,
            lineStyle: 0,
        })
        period1SeriesRef.current = period1Series

        // Date Range B series (Orange)
        const period2Series = chart.addSeries(LineSeries, {
            color: '#f0883e',
            lineWidth: 3,
            title: 'Date Range B',
            lastValueVisible: true,
            priceLineVisible: true,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 5,
            lineStyle: 0,
        })
        period2SeriesRef.current = period2Series

        // Process data
        const p1 = comparisonData.period1
        const p2 = comparisonData.period2

        const period1Data: LineData<Time>[] = p1.data.map((d, i) => {
            const value = chartMode === 'percent' ? d.change_pct : d.close
            return {
                time: ((i + 1) * 86400) as Time,
                value: value,
            }
        }).filter(d => typeof d.value === 'number' && !isNaN(d.value)) as LineData<Time>[]

        const period2Data: LineData<Time>[] = p2.data.map((d, i) => {
            const value = chartMode === 'percent' ? d.change_pct : d.close
            return {
                time: ((i + 1) * 86400) as Time,
                value: value,
            }
        }).filter(d => typeof d.value === 'number' && !isNaN(d.value)) as LineData<Time>[]

        period1Series.setData(period1Data)
        period2Series.setData(period2Data)

        chart.timeScale().fitContent()

        // Enhanced tooltip
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

            let tooltipHTML = `
        <div class="font-bold text-white mb-2 pb-2 border-b border-[#30363d] flex items-center gap-2">
          <span class="text-lg">📅</span>
          <span>Day ${dayIndex}</span>
        </div>
      `

            if (p1Data) {
                const p1Value = chartMode === 'percent' ? p1Data.change_pct : p1Data.close
                const isPositive = chartMode === 'percent' ? (p1Value ?? 0) >= 0 : true
                tooltipHTML += `
          <div class="mb-3">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-3 h-3 rounded-full bg-[#58a6ff]"></div>
              <span class="text-[#58a6ff] font-semibold">Date Range A</span>
            </div>
            <div class="ml-5 space-y-0.5">
              <div class="text-[#8b949e] text-[11px]">${p1Data.date}</div>
              <div class="font-mono font-bold ${isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'}">
                ${chartMode === 'percent' ? (p1Value ?? 0).toFixed(2) + '%' : '₹' + (p1Value ?? 0).toFixed(2)}
              </div>
            </div>
          </div>
        `
            }

            if (p2Data) {
                const p2Value = chartMode === 'percent' ? p2Data.change_pct : p2Data.close
                const isPositive = chartMode === 'percent' ? (p2Value ?? 0) >= 0 : true
                tooltipHTML += `
          <div>
            <div class="flex items-center gap-2 mb-1">
              <div class="w-3 h-3 rounded-full bg-[#f0883e]"></div>
              <span class="text-[#f0883e] font-semibold">Date Range B</span>
            </div>
            <div class="ml-5 space-y-0.5">
              <div class="text-[#8b949e] text-[11px]">${p2Data.date}</div>
              <div class="font-mono font-bold ${isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'}">
                ${chartMode === 'percent' ? (p2Value ?? 0).toFixed(2) + '%' : '₹' + (p2Value ?? 0).toFixed(2)}
              </div>
            </div>
          </div>
        `
            } else if (dataIndex >= p2.data.length && p2.data.length < p1.data.length) {
                tooltipHTML += `
          <div class="text-[#8b949e] italic flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-[#f0883e] opacity-40"></div>
            <span>Date Range B: No data (partial)</span>
          </div>
        `
            }

            tooltip.innerHTML = tooltipHTML
            tooltip.style.display = 'block'

            // Position tooltip
            const tooltipWidth = 240
            const tooltipHeight = tooltip.offsetHeight
            const padding = 15

            let left = param.point.x + padding
            let top = param.point.y - tooltipHeight / 2

            if (left + tooltipWidth > width) {
                left = param.point.x - tooltipWidth - padding
            }
            if (top < 0) top = padding
            if (top + tooltipHeight > height) top = height - tooltipHeight - padding

            tooltip.style.left = left + 'px'
            tooltip.style.top = top + 'px'
        })

        // Resize observer
        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = container.getBoundingClientRect()
            if (width > 0 && height > 0) {
                chart.applyOptions({ width, height })
            }
        })
        resizeObserver.observe(container)

        return () => {
            resizeObserver.disconnect()
            tooltip.remove()
            chart.remove()
            chartRef.current = null
        }
    }, [comparisonData, chartMode])

    // Reset zoom handler
    const handleResetZoom = () => {
        chartRef.current?.timeScale().fitContent()
    }

    // ===== SUMMARY CARD COMPONENT =====
    const SummaryCard = ({ period, color, label, isPartial, days }: {
        period: PeriodData
        color: string
        label: string
        isPartial: boolean
        days: number
    }) => (
        <div
            className="rounded-xl p-4 border-2 transition-all duration-300 hover:scale-[1.02]"
            style={{
                background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
                borderColor: `${color}40`
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                    <span className="font-bold text-white">{label}</span>
                </div>
                {isPartial && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded-full font-medium">
                        PARTIAL
                    </span>
                )}
            </div>

            <p className="text-xs text-[#8b949e] mb-3 font-medium">{period.label}</p>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d1117]/50 rounded-lg p-2">
                    <span className="text-[10px] text-[#8b949e] block mb-1">Return</span>
                    <p className={`font-mono font-bold text-lg ${period.summary.period_return_pct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                        {period.summary.period_return_pct >= 0 ? '+' : ''}{period.summary.period_return_pct}%
                    </p>
                </div>
                <div className="bg-[#0d1117]/50 rounded-lg p-2">
                    <span className="text-[10px] text-[#8b949e] block mb-1">Trading Days</span>
                    <p className="font-mono text-white text-lg font-bold">{period.summary.total_days}</p>
                </div>
                <div className="bg-[#0d1117]/50 rounded-lg p-2">
                    <span className="text-[10px] text-[#8b949e] block mb-1">Start Price</span>
                    <p className="font-mono text-white">₹{period.summary.start_price}</p>
                </div>
                <div className="bg-[#0d1117]/50 rounded-lg p-2">
                    <span className="text-[10px] text-[#8b949e] block mb-1">End Price</span>
                    <p className="font-mono text-white">₹{period.summary.end_price}</p>
                </div>
            </div>
        </div>
    )

    // ===== RENDER =====
    return (
        <div className={`fixed inset-0 bg-black/90 backdrop-blur-md z-[10000] flex items-center justify-center ${isFullscreen ? '' : 'p-4'}`}>
            <div
                className={`bg-[#0d1117] rounded-2xl overflow-hidden shadow-2xl border border-[#30363d] transition-all duration-300 ${isFullscreen
                    ? 'w-full h-full max-w-none max-h-none rounded-none'
                    : 'w-full max-w-5xl max-h-[95vh]'
                    }`}
            >
                {/* ===== HEADER ===== */}
                <div className="flex items-center justify-between p-4 border-b border-[#21262d] bg-gradient-to-r from-[#161b22] to-[#0d1117]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#1f6feb] flex items-center justify-center">
                            <ArrowLeftRight className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Period Comparison
                                <span className="px-2 py-0.5 bg-[#238636] text-white text-[10px] rounded-full font-medium">
                                    {symbol.replace('.NS', '')}
                                </span>
                            </h2>
                            <p className="text-xs text-[#8b949e]">
                                Compare stock performance across different time periods
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {step === 2 && (
                            <button
                                onClick={handleReset}
                                className="p-2 hover:bg-[#21262d] rounded-lg transition-colors text-[#8b949e] hover:text-white flex items-center gap-1.5 text-sm"
                            >
                                <RotateCcw size={16} />
                                <span>Reset</span>
                            </button>
                        )}
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 hover:bg-[#21262d] rounded-lg transition-colors text-[#8b949e] hover:text-white"
                        >
                            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[#f85149]/20 rounded-lg transition-colors text-[#8b949e] hover:text-[#f85149]"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* ===== CONTENT ===== */}
                <div
                    className="p-5 overflow-y-auto"
                    style={{ maxHeight: isFullscreen ? 'calc(100vh - 80px)' : 'calc(95vh - 80px)' }}
                >
                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${step >= 1 ? 'bg-[#1f6feb] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}>
                            <Clock size={14} />
                            <span>1. Select Duration</span>
                        </div>
                        <ChevronRight size={16} className="text-[#30363d]" />
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${step >= 2 ? 'bg-[#1f6feb] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}>
                            <CalendarDays size={14} />
                            <span>2. View Comparison</span>
                        </div>
                    </div>

                    {/* ===== STEP 1: Configuration ===== */}
                    <div className={`space-y-6 ${step === 2 && comparisonData ? 'hidden' : ''}`}>
                        {/* Duration Selection */}
                        <div className="bg-[#161b22] rounded-xl p-5 border border-[#21262d]">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-[#58a6ff]" />
                                Select Comparison Duration
                            </h3>

                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                                {DURATION_PRESETS.map((preset) => (
                                    <button
                                        key={preset.days}
                                        onClick={() => handleDurationSelect(preset.days)}
                                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-center ${selectedDuration === preset.days && !customDays
                                            ? 'bg-[#1f6feb] border-[#58a6ff] text-white scale-105'
                                            : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#58a6ff] hover:text-white'
                                            }`}
                                    >
                                        <div className="text-lg font-bold">{preset.label}</div>
                                        <div className="text-[10px] opacity-70">{preset.description}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Custom Days Input */}
                            <div className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-xl border border-[#30363d]">
                                <span className="text-[#8b949e] text-sm">Custom:</span>
                                <input
                                    type="number"
                                    value={customDays}
                                    onChange={(e) => handleCustomDaysChange(e.target.value)}
                                    placeholder="1 - 3650"
                                    min="1"
                                    max={MAX_DAYS}
                                    className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-[#484f58]"
                                />
                                <span className="text-[#8b949e] text-sm">days</span>
                                <span className="text-[#484f58] text-[10px]">(max 10 years)</span>
                            </div>

                            <div className="mt-3 flex items-center gap-2 text-xs text-[#8b949e]">
                                <Info size={12} />
                                <span>Selected duration: <strong className="text-[#58a6ff]">{activeDays} days</strong></span>
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Date Range A */}
                            <div className="bg-[#161b22] rounded-xl p-5 border-2 border-[#58a6ff]/30 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#58a6ff] to-[#1f6feb]"></div>

                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-4 h-4 rounded-full bg-[#58a6ff]"></div>
                                    <h4 className="text-white font-semibold">Date Range A</h4>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-[#8b949e] block mb-1.5">
                                            Start Date <span className="text-[#484f58]">(DD-MM-YYYY)</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={date1}
                                            max={getTodayString()}
                                            onChange={(e) => setDate1(e.target.value)}
                                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white focus:border-[#58a6ff] outline-none transition-colors"
                                        />
                                        {date1 && (
                                            <div className="mt-1.5 text-[10px] text-[#58a6ff] font-medium">
                                                Selected: {formatDateDisplay(date1)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs bg-[#0d1117]/50 rounded-lg p-3">
                                        <Calendar size={14} className="text-[#58a6ff]" />
                                        <div>
                                            <span className="text-[#8b949e]">End Date: </span>
                                            <span className="text-white font-medium">{formatDateDisplay(period1Info.endDate)}</span>
                                            {period1Info.isPartial && (
                                                <span className="ml-2 text-yellow-400">(Today - Partial)</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-xs text-[#8b949e] flex items-center gap-2">
                                        <Zap size={12} className="text-[#58a6ff]" />
                                        <span>
                                            <strong className="text-white">{period1Info.actualDays}</strong> days of data
                                            {period1Info.isPartial && ' (partial)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Date Range B */}
                            <div className="bg-[#161b22] rounded-xl p-5 border-2 border-[#f0883e]/30 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#f0883e] to-[#da3633]"></div>

                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-4 h-4 rounded-full bg-[#f0883e]"></div>
                                    <h4 className="text-white font-semibold">Date Range B</h4>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-[#8b949e] block mb-1.5">
                                            Start Date <span className="text-[#484f58]">(DD-MM-YYYY)</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={date2}
                                            max={getTodayString()}
                                            onChange={(e) => setDate2(e.target.value)}
                                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white focus:border-[#f0883e] outline-none transition-colors"
                                        />
                                        {date2 && (
                                            <div className="mt-1.5 text-[10px] text-[#f0883e] font-medium">
                                                Selected: {formatDateDisplay(date2)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs bg-[#0d1117]/50 rounded-lg p-3">
                                        <Calendar size={14} className="text-[#f0883e]" />
                                        <div>
                                            <span className="text-[#8b949e]">End Date: </span>
                                            <span className="text-white font-medium">{formatDateDisplay(period2Info.endDate)}</span>
                                            {period2Info.isPartial && (
                                                <span className="ml-2 text-yellow-400">(Today - Partial)</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-xs text-[#8b949e] flex items-center gap-2">
                                        <Zap size={12} className="text-[#f0883e]" />
                                        <span>
                                            <strong className="text-white">{period2Info.actualDays}</strong> days of data
                                            {period2Info.isPartial && ' (partial)'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-gradient-to-r from-[#1f6feb]/10 to-[#f0883e]/10 rounded-xl p-4 border border-[#30363d] flex items-start gap-3">
                            <Info size={18} className="text-[#58a6ff] mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-[#8b949e]">
                                <p className="mb-1">
                                    <strong className="text-white">How it works:</strong> Both periods will be aligned by trading day (Day 1, Day 2, etc.) for easy comparison.
                                </p>
                                <p className="mb-1">
                                    <strong className="text-yellow-400">Note:</strong> Chart shows only <strong className="text-white">trading days</strong> (weekends & holidays excluded). So 30 calendar days ≈ 20-22 trading days.
                                </p>
                                <p>
                                    If a period extends beyond today's date, only available data will be shown (marked as "PARTIAL").
                                </p>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-[#f85149]/10 border border-[#f85149]/30 rounded-xl p-4 text-[#f85149] text-sm flex items-center gap-2">
                                <X size={16} />
                                {error}
                            </div>
                        )}

                        {/* Compare Button */}
                        <button
                            onClick={handleCompare}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] text-white rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#1f6feb]/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={22} className="animate-spin" />
                                    <span>Comparing Periods...</span>
                                </>
                            ) : (
                                <>
                                    <BarChart3 size={22} />
                                    <span>Compare Now</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* ===== STEP 2: Chart View ===== */}
                    {step === 2 && comparisonData && comparisonData.period1 && comparisonData.period2 && (
                        <div className="space-y-5">
                            {/* Chart Controls */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <TrendingUp size={18} className="text-[#3fb950]" />
                                        Performance Chart
                                    </h3>

                                    {/* Legend */}
                                    <div className="flex items-center gap-4 text-xs bg-[#161b22] px-3 py-1.5 rounded-full border border-[#21262d]">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#58a6ff]"></span>
                                            <span className="text-[#58a6ff]">Date Range A</span>
                                            <span className="text-[#484f58]">({comparisonData.period1.summary.total_days} days)</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#f0883e]"></span>
                                            <span className="text-[#f0883e]">Date Range B</span>
                                            <span className="text-[#484f58]">({comparisonData.period2.summary.total_days} days)</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Chart Mode Toggle */}
                                    <div className="flex bg-[#161b22] rounded-lg p-1 border border-[#21262d]">
                                        <button
                                            onClick={() => setChartMode('percent')}
                                            className={`px-3 py-1.5 text-xs rounded-md transition-all ${chartMode === 'percent' ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e] hover:text-white'}`}
                                        >
                                            % Change
                                        </button>
                                        <button
                                            onClick={() => setChartMode('price')}
                                            className={`px-3 py-1.5 text-xs rounded-md transition-all ${chartMode === 'price' ? 'bg-[#1f6feb] text-white' : 'text-[#8b949e] hover:text-white'}`}
                                        >
                                            Price (₹)
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleResetZoom}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-[#161b22] text-[#8b949e] hover:text-white border border-[#21262d] hover:border-[#30363d] transition-all"
                                    >
                                        ⟲ Reset Zoom
                                    </button>
                                </div>
                            </div>

                            {/* Chart Container */}
                            <div
                                className={`bg-[#0d1117] rounded-xl border border-[#21262d] relative overflow-hidden ${isFullscreen ? 'h-[calc(100vh-380px)]' : 'h-[400px]'
                                    }`}
                            >
                                <div ref={chartContainerRef} className="w-full h-full" />
                            </div>

                            {/* Summary Cards */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <SummaryCard
                                    period={comparisonData.period1}
                                    color="#58a6ff"
                                    label="Date Range A"
                                    isPartial={period1Info.isPartial}
                                    days={period1Info.actualDays}
                                />
                                <SummaryCard
                                    period={comparisonData.period2}
                                    color="#f0883e"
                                    label="Date Range B"
                                    isPartial={period2Info.isPartial}
                                    days={period2Info.actualDays}
                                />
                            </div>

                            {/* Comparison Insights */}
                            {comparisonData.comparison && (
                                <div className="bg-gradient-to-r from-[#161b22] via-[#0d1117] to-[#161b22] rounded-xl p-5 border border-[#21262d]">
                                    <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                                        <Zap size={18} className="text-yellow-400" />
                                        Quick Insights
                                    </h4>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-4 bg-[#0d1117] rounded-xl border border-[#21262d]">
                                            <p className="text-[10px] text-[#8b949e] uppercase tracking-wide mb-2">Return Difference</p>
                                            <p className={`text-2xl font-bold font-mono ${comparisonData.comparison.return_difference >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                                {comparisonData.comparison.return_difference >= 0 ? '+' : ''}{comparisonData.comparison.return_difference}%
                                            </p>
                                        </div>

                                        <div className="text-center p-4 bg-[#0d1117] rounded-xl border border-[#21262d]">
                                            <p className="text-[10px] text-[#8b949e] uppercase tracking-wide mb-2">Winner</p>
                                            <p className="text-2xl font-bold">
                                                {comparisonData.comparison.period1_better ? (
                                                    <span className="text-[#58a6ff]">🔵 A</span>
                                                ) : (
                                                    <span className="text-[#f0883e]">🟠 B</span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="text-center p-4 bg-[#0d1117] rounded-xl border border-[#21262d]">
                                            <p className="text-[10px] text-[#8b949e] uppercase tracking-wide mb-2">Avg Price Change</p>
                                            <p className={`text-2xl font-bold font-mono ${comparisonData.comparison.avg_price_change >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                                {comparisonData.comparison.avg_price_change >= 0 ? '+' : ''}{comparisonData.comparison.avg_price_change}%
                                            </p>
                                        </div>

                                        <div className="text-center p-4 bg-[#0d1117] rounded-xl border border-[#21262d]">
                                            <p className="text-[10px] text-[#8b949e] uppercase tracking-wide mb-2">Volume Change</p>
                                            <p className={`text-2xl font-bold font-mono ${comparisonData.comparison.volume_change_pct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                                {comparisonData.comparison.volume_change_pct >= 0 ? '+' : ''}{comparisonData.comparison.volume_change_pct?.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
