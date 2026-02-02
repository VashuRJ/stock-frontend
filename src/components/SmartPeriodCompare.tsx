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
import html2canvas from 'html2canvas'
import {
    X, Calendar, TrendingUp, BarChart3, ArrowLeftRight,
    Loader2, Maximize2, Minimize2, Clock, CalendarDays,
    ChevronRight, Info, Zap, RotateCcw, CheckSquare, Square, Camera
} from 'lucide-react'
import {
    comparePeriods,
    PeriodCompareResponse,
    PeriodCompareRequest,
    PeriodData
} from '@/api/client'
import CalendarPopup, {
    formatDateForAPI,
    formatDateForDisplay as formatDDMMYYYY,
    handleInputMask
} from './CalendarPopup'

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

// Calculate start date going back from today for N days
const getRecentPeriodStart = (days: number): string => {
    const today = new Date()
    // Calculate start date: today - days + 1 (to make end date inclusive of today)
    // Actually, usually data goes up to 'yesterday' close if today is active, but let's assume 'today' is the anchor.
    // If market isn't closed, we might get partial data for today.
    // Logic: Start = End - Duration + 1
    const start = new Date(today)
    start.setDate(today.getDate() - days + 1)
    return formatDateForInput(start)
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
    const [isAutoDate1, setIsAutoDate1] = useState(true)

    // Date states
    const [date1, setDate1] = useState<string>(() => {
        // Default: Current period (last 30 days ending today)
        return getRecentPeriodStart(30)
    })
    const [date2, setDate2] = useState<string>('')

    // Calendar & Input States
    const [showCal1, setShowCal1] = useState(false)
    const [showCal2, setShowCal2] = useState(false)
    const [date1Input, setDate1Input] = useState('')
    const [date2Input, setDate2Input] = useState('')

    // Sync inputs with state (handles initialization + calendar selection)
    useEffect(() => {
        if (date1) setDate1Input(formatDDMMYYYY(date1))
    }, [date1])

    useEffect(() => {
        if (date2) setDate2Input(formatDDMMYYYY(date2))
    }, [date2])



    // Input handlers
    const handleDate1InputChange = (val: string) => {
        setDate1Input(val)
        if (val.length === 10) setDate1(formatDateForAPI(val))
        else if (val === '') setDate1('')
    }

    const handleDate2InputChange = (val: string) => {
        setDate2Input(val)
        if (val.length === 10) setDate2(formatDateForAPI(val))
        else if (val === '') setDate2('')
    }

    // Handle Enter Key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCompare()
        }
    }

    // Comparison states
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [comparisonData, setComparisonData] = useState<PeriodCompareResponse | null>(null)
    const [chartMode, setChartMode] = useState<'percent' | 'price'>('percent')
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Chart refs
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const reportContainerRef = useRef<HTMLDivElement>(null) // Ref for full report snapshot
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

    // Calculate Correlation (Pattern Match)
    const patternCorrelation = useMemo(() => {
        if (!comparisonData?.period1?.data || !comparisonData?.period2?.data) return 0

        // Get array of percent changes or normalized prices
        // Filter to common length
        const len = Math.min(comparisonData.period1.data.length, comparisonData.period2.data.length)
        if (len < 5) return 0 // Need decent sample size

        const arr1 = comparisonData.period1.data.slice(0, len).map(d => d.change_pct || 0)
        const arr2 = comparisonData.period2.data.slice(0, len).map(d => d.change_pct || 0)

        // Standard Pearson Correlation Formula
        const n = len
        let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0

        for (let i = 0; i < n; i++) {
            sum1 += arr1[i]
            sum2 += arr2[i]
            sum1Sq += arr1[i] ** 2
            sum2Sq += arr2[i] ** 2
            pSum += arr1[i] * arr2[i]
        }

        const num = pSum - (sum1 * sum2 / n)
        const den = Math.sqrt((sum1Sq - sum1 ** 2 / n) * (sum2Sq - sum2 ** 2 / n))

        if (den === 0) return 0

        const corr = num / den // Range -1 to 1
        return Math.round(corr * 100) // Convert to percentage (-100 to 100)
    }, [comparisonData])

    // ===== HANDLERS =====
    const handleDurationSelect = (days: number) => {
        setSelectedDuration(days)
        setCustomDays('')
        // Auto-update Date Range A if in auto mode
        if (isAutoDate1) {
            setDate1(getRecentPeriodStart(days))
        }
    }

    const handleCustomDaysChange = (value: string) => {
        // Only allow valid numbers up to MAX_DAYS
        const numValue = parseInt(value)
        if (value === '' || (numValue >= 1 && numValue <= MAX_DAYS)) {
            setCustomDays(value)
            if (numValue >= 1) {
                setSelectedDuration(0)
                // Auto-update Date Range A if in auto mode
                if (isAutoDate1) {
                    setDate1(getRecentPeriodStart(numValue))
                }
            }
        } else if (numValue > MAX_DAYS) {
            // Auto-correct to max
            setCustomDays(MAX_DAYS.toString())
            setSelectedDuration(0)
            if (isAutoDate1) {
                setDate1(getRecentPeriodStart(MAX_DAYS))
            }
        }
    }

    // Quick Set Handlers for Reference Period
    const handleSetPreviousPeriod = () => {
        if (!date1) return
        const d1 = new Date(date1)
        const d2 = new Date(d1)
        d2.setDate(d1.getDate() - activeDays)
        setDate2(formatDateForInput(d2))
    }

    const handleSetLastYearPeriod = () => {
        if (!date1) return
        const d1 = new Date(date1)
        const d2 = new Date(d1)
        d2.setFullYear(d1.getFullYear() - 1)
        setDate2(formatDateForInput(d2))
    }

    const handleDownloadSnapshot = async () => {
        if (!reportContainerRef.current) return

        try {
            // Capture the full report container (Header + Legend + Chart + Summary)
            const canvas = await html2canvas(reportContainerRef.current, {
                backgroundColor: '#0d1117' as any,
                scale: 2, // 2x resolution
                useCORS: true,
                logging: false,
                ignoreElements: (element: Element) => {
                    // Ignore the camera/reset buttons in the screenshot to make it look cleaner
                    const el = element as HTMLElement
                    return el.tagName === 'BUTTON' && el.innerText !== '% Change' && el.innerText !== 'Price (₹)'
                }
            })

            const link = document.createElement('a')
            link.download = `${symbol}_comparison_report_${date1}_vs_${date2}.png`
            link.href = canvas.toDataURL('image/png')
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (err) {
            console.error("Snapshot failed:", err)
        }
    }

    // Keyboard shortcut for snapshot (allows capturing tooltip while hovering)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Trigger on 's' key only when in Chart View (Step 2)
            if (e.key.toLowerCase() === 's' && step === 2 && !e.repeat) {
                // Prevent if typing in an input
                const target = e.target as HTMLElement
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

                e.preventDefault()
                handleDownloadSnapshot()
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [step, handleDownloadSnapshot]) // Re-bind if dependencies change

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
            setError('Current Period start date cannot be in the future')
            return
        }

        if (new Date(date2) > today) {
            setError('Reference Period start date cannot be in the future')
            return
        }

        // Validate we have at least some data days
        if (period1Info.actualDays < 1) {
            setError('Current Period has no valid trading days. Please select an earlier start date.')
            return
        }

        if (period2Info.actualDays < 1) {
            setError('Reference Period has no valid trading days. Please select an earlier start date.')
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
                setError(`No data found for Current Period (${formatDateDisplay(date1)} - ${formatDateDisplay(period1Info.endDate)}). The database may not have historical data for this date range.`)
                return
            }

            if (!data.period2?.data?.length) {
                setError(`No data found for Reference Period (${formatDateDisplay(date2)} - ${formatDateDisplay(period2Info.endDate)}). The database may not have historical data for this date range.`)
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
            localization: {
                timeFormatter: (time: Time) => {
                    const index = Math.floor((time as number) / 86400) - 1
                    if (comparisonData?.period1?.data?.[index]?.date) {
                        const date = new Date(comparisonData.period1.data[index].date)
                        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
                    }
                    return ''
                }
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
                    const index = Math.floor((time as number) / 86400) - 1
                    if (comparisonData?.period1?.data?.[index]?.date) {
                        const date = new Date(comparisonData.period1.data[index].date)
                        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    }
                    return ''
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

        // Current Period series (Blue)
        const period1Series = chart.addSeries(LineSeries, {
            color: '#58a6ff',
            lineWidth: 3,
            title: 'Current Period',
            lastValueVisible: true,
            priceLineVisible: true,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 5,
            lineStyle: 0,
        })
        period1SeriesRef.current = period1Series

        // Reference Period series (Orange)
        const period2Series = chart.addSeries(LineSeries, {
            color: '#f0883e',
            lineWidth: 3,
            title: 'Reference Period',
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

            // Helper for timezone-safe date formatting
            const formatDateSafe = (dateStr: string) => {
                const parts = dateStr.split('-')
                if (parts.length === 3) {
                    // Create date object using local components (YYYY, MM-1, DD)
                    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                }
                return dateStr
            }

            const headerDate = p1Data?.date ? formatDateSafe(p1Data.date) : `Day ${dayIndex}`
            const headerDate2 = p2Data?.date ? formatDateSafe(p2Data.date) : 'N/A'

            let tooltipHTML = `
        <div class="font-bold text-white mb-2 pb-2 border-b border-[#30363d]">
          <div class="flex items-center justify-between text-xs mb-1 opacity-70">
             <span>Day ${dayIndex} Comparison</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
             <span class="text-[#58a6ff]">${headerDate}</span>
             <span class="text-[#8b949e] mx-1">|</span>
             <span class="text-[#f0883e]">${headerDate2}</span>
          </div>
        </div>
      `

            if (p1Data) {
                const p1Value = chartMode === 'percent' ? p1Data.change_pct : p1Data.close
                const isPositive = chartMode === 'percent' ? (p1Value ?? 0) >= 0 : true
                tooltipHTML += `
            <div>
            <div class="flex items-center gap-2 mb-0.5">
              <div class="w-2.5 h-2.5 rounded-full bg-[#58a6ff]"></div>
              <span class="text-[#58a6ff] font-semibold text-xs">Current Period</span>
            </div>
            <div class="ml-4.5">
              <div class="font-mono font-bold text-sm ${isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'}">
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
            <div class="flex items-center gap-2 mb-0.5">
              <div class="w-2.5 h-2.5 rounded-full bg-[#f0883e]"></div>
              <span class="text-[#f0883e] font-semibold text-xs">Reference Period</span>
            </div>
            <div class="ml-4.5">
              <div class="font-mono font-bold text-sm ${isPositive ? 'text-[#3fb950]' : 'text-[#f85149]'}">
                ${chartMode === 'percent' ? (p2Value ?? 0).toFixed(2) + '%' : '₹' + (p2Value ?? 0).toFixed(2)}
              </div>
            </div>
          </div>
        `
            } else if (dataIndex >= p2.data.length && p2.data.length < p1.data.length) {
                tooltipHTML += `
          <div class="text-[#8b949e] italic flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-[#f0883e] opacity-40"></div>
            <span>Reference: No data (partial)</span>
          </div>
        `
            }

            // Alpha / Gap Calculation
            if (p1Data && p2Data) {
                const val1 = chartMode === 'percent' ? p1Data.change_pct : p1Data.close
                const val2 = chartMode === 'percent' ? p2Data.change_pct : p2Data.close

                if (typeof val1 === 'number' && typeof val2 === 'number') {
                    const diff = val1 - val2
                    const isLead = diff >= 0
                    const label = isLead ? "Lead (Alpha)" : "Lag (Gap)"
                    const colorClass = isLead ? "text-[#3fb950]" : "text-[#f85149]"
                    const sign = isLead ? "+" : ""
                    const diffStr = chartMode === 'percent'
                        ? `${sign}${diff.toFixed(2)}%`
                        : `${sign}₹${diff.toFixed(2)}`

                    tooltipHTML += `
                        <div class="mt-3 pt-2 border-t border-[#30363d] flex items-center justify-between">
                            <span class="text-xs text-[#8b949e] font-medium uppercase tracking-wide">${label}</span>
                            <span class="${colorClass} font-mono font-bold text-sm">${diffStr}</span>
                        </div>
                    `
                }
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
                            {/* Current Period */}
                            <div className="bg-[#161b22] rounded-xl p-5 border-2 border-[#58a6ff]/30 relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#58a6ff] to-[#1f6feb] rounded-t-lg"></div>

                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-4 h-4 rounded-full bg-[#58a6ff]"></div>
                                    <h4 className="text-white font-semibold">Current Period</h4>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs text-[#8b949e]">
                                                Start Date <span className="text-[#484f58]">(DD/MM/YYYY)</span>
                                            </label>

                                            <button
                                                onClick={() => {
                                                    const newAutoState = !isAutoDate1
                                                    setIsAutoDate1(newAutoState)
                                                    if (newAutoState) {
                                                        // If switching back to auto, recalculate immediately
                                                        setDate1(getRecentPeriodStart(activeDays))
                                                        setShowCal1(false)
                                                    }
                                                }}
                                                className={`flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded border transition-colors ${isAutoDate1
                                                    ? 'text-[#58a6ff] bg-[#58a6ff]/10 border-[#58a6ff]/20'
                                                    : 'text-[#8b949e] bg-[#21262d] border-[#30363d] hover:text-white'
                                                    }`}
                                            >
                                                {isAutoDate1 ? <CheckSquare size={12} /> : <Square size={12} />}
                                                <span>Auto (Current)</span>
                                            </button>
                                        </div>

                                        <div className={`relative ${isAutoDate1 ? 'opacity-90' : ''}`} title={isAutoDate1 ? "Auto-set to current period" : "Select start date"}>
                                            <input
                                                type="text"
                                                value={date1Input}
                                                readOnly={isAutoDate1}
                                                disabled={isAutoDate1}
                                                onChange={(e) => handleInputMask(e, handleDate1InputChange)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="DD/MM/YYYY"
                                                maxLength={10}
                                                className={`w-full bg-[#0d1117] border rounded-lg pl-3 pr-10 py-2.5 text-white outline-none font-mono transition-colors ${isAutoDate1
                                                    ? 'border-[#30363d] cursor-not-allowed text-[#8b949e]'
                                                    : 'border-[#30363d] focus:border-[#58a6ff]'
                                                    }`}
                                            />

                                            {isAutoDate1 ? (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] p-1">
                                                    <RotateCcw size={14} />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setShowCal1(!showCal1)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#58a6ff] transition-colors p-1"
                                                    aria-label="Toggle calendar"
                                                >
                                                    <Calendar size={16} />
                                                </button>
                                            )}

                                            {!isAutoDate1 && (
                                                <CalendarPopup
                                                    isOpen={showCal1}
                                                    onClose={() => setShowCal1(false)}
                                                    value={date1Input}
                                                    onChange={(val) => {
                                                        setDate1Input(val)
                                                        setDate1(formatDateForAPI(val))
                                                    }}
                                                    disablePast={false}
                                                    className="top-full mt-2 right-0"
                                                />
                                            )}
                                        </div>
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

                            {/* Reference Period */}
                            <div className="bg-[#161b22] rounded-xl p-5 border-2 border-[#f0883e]/30 relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#f0883e] to-[#da3633] rounded-t-lg"></div>

                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-[#f0883e]"></div>
                                        <h4 className="text-white font-semibold">Reference Period</h4>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={handleSetPreviousPeriod}
                                            className="text-[10px] px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] rounded transition-all"
                                            title="Compare with immediately previous period"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={handleSetLastYearPeriod}
                                            className="text-[10px] px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white border border-[#30363d] rounded transition-all"
                                            title="Compare with same period last year"
                                        >
                                            1Y Ago
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-[#8b949e] block mb-1.5">
                                            Start Date <span className="text-[#484f58]">(DD/MM/YYYY)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={date2Input}
                                                onChange={(e) => handleInputMask(e, handleDate2InputChange)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="DD/MM/YYYY"
                                                maxLength={10}
                                                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-3 pr-10 py-2.5 text-white focus:border-[#f0883e] outline-none transition-colors font-mono"
                                            />
                                            <button
                                                onClick={() => setShowCal2(!showCal2)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#f0883e] transition-colors p-1"
                                                aria-label="Toggle calendar"
                                            >
                                                <Calendar size={16} />
                                            </button>

                                            <CalendarPopup
                                                isOpen={showCal2}
                                                onClose={() => setShowCal2(false)}
                                                value={date2Input}
                                                onChange={(val) => {
                                                    setDate2Input(val)
                                                    setDate2(formatDateForAPI(val))
                                                }}
                                                disablePast={false}
                                                className="top-full mt-2 right-0"
                                            />
                                        </div>
                                        {date2 && (
                                            <div className="mt-1.5 text-[10px] text-[#f0883e] font-medium">
                                                Selected: {formatDateDisplay(date2)}
                                            </div>
                                        )}
                                    </div>

                                    {date2 && (
                                        <>
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
                                        </>
                                    )}
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
                            disabled={loading || !date1 || !date2}
                            className="w-full py-4 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] text-white rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#1f6feb]/20 disabled:shadow-none"
                            title={!date2 ? "Please select a Reference Period to start comparison" : "Start Comparison"}
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
                        <div ref={reportContainerRef} className="space-y-5 bg-[#0d1117] p-4 -m-4 rounded-xl"> {/* Added bg and padding for screenshot context */}
                            {/* Chart Controls */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-white font-semibold flex items-center gap-2 text-lg">
                                        <TrendingUp size={20} className="text-[#3fb950]" />
                                        <span>{symbol} Analysis</span>
                                    </h3>

                                    {/* Legend */}
                                    <div className="flex items-center gap-4 text-xs bg-[#161b22] px-3 py-1.5 rounded-full border border-[#21262d]">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#58a6ff]"></span>
                                            <span className="text-[#58a6ff]">Current Period</span>
                                            <span className="text-[#484f58]">({comparisonData.period1.summary.total_days} days)</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#f0883e]"></span>
                                            <span className="text-[#f0883e]">Reference Period</span>
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
                                        onClick={handleDownloadSnapshot}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-[#161b22] text-[#8b949e] hover:text-white border border-[#21262d] hover:border-[#30363d] transition-all flex items-center gap-1.5"
                                        title="Download Chart Image (Press 'S')"
                                    >
                                        <Camera size={14} />
                                        <span>Save</span>
                                    </button>
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
                                    label="Current Period"
                                    isPartial={period1Info.isPartial}
                                    days={period1Info.actualDays}
                                />
                                <SummaryCard
                                    period={comparisonData.period2}
                                    color="#f0883e"
                                    label="Reference Period"
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
                                            <p className="text-[10px] text-[#8b949e] uppercase tracking-wide mb-2">Pattern Match</p>
                                            <p className={`text-2xl font-bold font-mono ${patternCorrelation > 60 ? 'text-[#3fb950]' :
                                                    patternCorrelation > 20 ? 'text-yellow-400' :
                                                        patternCorrelation < -20 ? 'text-[#f85149]' : 'text-[#8b949e]'
                                                }`}>
                                                {patternCorrelation}%
                                            </p>
                                            <p className="text-[9px] text-[#8b949e] mt-1">
                                                {patternCorrelation > 20 ? 'Similarity' : patternCorrelation < -20 ? 'Inverse' : 'Correlation'}
                                            </p>
                                        </div>

                                        <div className="text-center p-4 bg-[#0d1117] rounded-xl border border-[#21262d]">
                                            <p className="text-[10px] text-[#8b949e] uppercase tracking-wide mb-2">Return Diff</p>
                                            <p className={`text-2xl font-bold font-mono ${comparisonData.comparison.return_difference >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                                {comparisonData.comparison.return_difference >= 0 ? '+' : ''}{comparisonData.comparison.return_difference}%
                                            </p>
                                            <p className="text-[9px] text-[#8b949e] mt-1">{comparisonData.comparison.period1_better ? 'Current leads' : 'Reference leads'}</p>
                                        </div>

                                        <div className="text-center p-4 bg-[#0d1117] rounded-xl border border-[#21262d]">
                                            <p className="text-[10px] text-[#8b949e] uppercase tracking-wide mb-2">Winner</p>
                                            <div className="flex items-center justify-center gap-2 h-8">
                                                {comparisonData.comparison.period1_better ? (
                                                    <>
                                                        <div className="w-3 h-3 rounded-full bg-[#58a6ff]"></div>
                                                        <span className="font-bold text-[#58a6ff]">Current</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-3 h-3 rounded-full bg-[#f0883e]"></div>
                                                        <span className="font-bold text-[#f0883e]">Reference</span>
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-[#8b949e] mt-1">based on return</p>
                                        </div>

                                        <div className="text-center p-4 bg-[#0d1117] rounded-xl border border-[#21262d]">
                                            <p className="text-[10px] text-[#8b949e] uppercase tracking-wide mb-2">Avg Volatility</p>

                                            {comparisonData.comparison.volatility_comparison ? (
                                                <>
                                                    <p className="text-xl font-bold font-mono text-white">
                                                        {comparisonData.comparison.volatility_comparison.period1_range_pct}%
                                                    </p>
                                                    <p className="text-[9px] text-[#8b949e] mt-1">
                                                        Vs {comparisonData.comparison.volatility_comparison.period2_range_pct}% (Ref)
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-xl font-bold font-mono text-white">
                                                    {Math.abs(Number(comparisonData.comparison.avg_price_change))}%
                                                </p>
                                            )}
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
