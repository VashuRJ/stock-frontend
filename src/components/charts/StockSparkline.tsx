/**
 * StockSparkline.tsx
 * 
 * A lightweight sparkline chart component for displaying intraday price movement.
 * Shows full trading day data from Market Open (9:15 AM) to Market Close (3:30 PM).
 * 
 * Features:
 * - SVG-based rendering (no heavy chart library)
 * - Automatic color based on daily change (green/red)
 * - Responsive sizing
 * - Loading state with skeleton
 * - Error graceful fallback
 * 
 * Usage:
 * <StockSparkline symbol="RELIANCE.NS" changePercent={2.5} />
 * 
 * @author Senior Dev Team
 * @version 2.0.0
 */

import React, { useEffect, useState, useMemo } from 'react'
import { api } from '@/api/client'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface StockSparklineProps {
    /** Stock symbol with exchange suffix (e.g., "RELIANCE.NS") */
    symbol: string
    /** Daily percentage change - determines line color */
    changePercent: number
    /** Width of sparkline in pixels (default: 80) */
    width?: number
    /** Height of sparkline in pixels (default: 32) */
    height?: number
    /** Show area fill under line (default: true) */
    showFill?: boolean
}

interface PricePoint {
    time: string
    price: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default sparkline dimensions */
const DEFAULT_WIDTH = 80
const DEFAULT_HEIGHT = 32
const PADDING = 2

/** Colors for positive/negative change */
const COLORS = {
    positive: {
        line: '#26a69a',      // Green line
        fill: 'rgba(38, 166, 154, 0.15)'
    },
    negative: {
        line: '#ef5350',      // Red line  
        fill: 'rgba(239, 83, 80, 0.15)'
    },
    neutral: {
        line: '#787b86',      // Gray for no change
        fill: 'rgba(120, 123, 134, 0.1)'
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

const StockSparkline: React.FC<StockSparklineProps> = ({
    symbol,
    changePercent,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    showFill = true
}) => {
    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------
    const [chartData, setChartData] = useState<PricePoint[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    // -------------------------------------------------------------------------
    // DATA FETCHING
    // -------------------------------------------------------------------------
    useEffect(() => {
        let isMounted = true

        const fetchIntradayData = async () => {
            try {
                setLoading(true)
                setError(false)

                const response = await api.get(`/stocks/intraday/${symbol}`)
                const data = response.data || []

                if (!isMounted) return

                if (data.length === 0) {
                    setChartData([])
                    setError(true)
                    return
                }

                // Process ALL intraday points (full trading day: 9:15 AM - 3:30 PM)
                // This gives us the complete day's price movement
                const points: PricePoint[] = data.map((item: any) => ({
                    time: item.date,
                    price: parseFloat(item.close) || 0
                })).filter((p: PricePoint) => p.price > 0)

                setChartData(points)
            } catch (err) {
                console.error(`[StockSparkline] Failed to load data for ${symbol}:`, err)
                if (isMounted) {
                    setChartData([])
                    setError(true)
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        fetchIntradayData()

        // Cleanup to prevent memory leaks
        return () => {
            isMounted = false
        }
    }, [symbol])

    // -------------------------------------------------------------------------
    // COMPUTED VALUES
    // -------------------------------------------------------------------------

    /** Get color scheme based on change percent */
    const colorScheme = useMemo(() => {
        if (changePercent > 0) return COLORS.positive
        if (changePercent < 0) return COLORS.negative
        return COLORS.neutral
    }, [changePercent])

    /** Generate SVG path from price data */
    const { linePath, areaPath } = useMemo(() => {
        if (chartData.length < 2) {
            return { linePath: '', areaPath: '' }
        }

        const prices = chartData.map(d => d.price)
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const priceRange = maxPrice - minPrice || 1 // Avoid division by zero

        const chartWidth = width - (PADDING * 2)
        const chartHeight = height - (PADDING * 2)

        // Generate points
        const points = chartData.map((d, i) => {
            const x = PADDING + (i / (chartData.length - 1)) * chartWidth
            const y = height - PADDING - ((d.price - minPrice) / priceRange) * chartHeight
            return { x, y }
        })

        // Create line path
        const linePoints = points.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
        ).join(' ')

        // Create area path (for fill under line)
        const areaPoints = [
            `M ${points[0].x.toFixed(2)} ${height - PADDING}`, // Start at bottom left
            ...points.map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
            `L ${points[points.length - 1].x.toFixed(2)} ${height - PADDING}`, // End at bottom right
            'Z' // Close path
        ].join(' ')

        return { linePath: linePoints, areaPath: areaPoints }
    }, [chartData, width, height])

    // -------------------------------------------------------------------------
    // RENDER: LOADING STATE
    // -------------------------------------------------------------------------
    if (loading) {
        return (
            <div
                className="flex items-center justify-center animate-pulse"
                style={{ width, height }}
            >
                <div
                    className="bg-[#2a2e39] rounded"
                    style={{ width: width * 0.8, height: 2 }}
                />
            </div>
        )
    }

    // -------------------------------------------------------------------------
    // RENDER: ERROR / NO DATA STATE
    // -------------------------------------------------------------------------
    if (error || chartData.length < 2) {
        return (
            <div
                className="flex items-center justify-center"
                style={{ width, height }}
            >
                <div
                    className="bg-[#2a2e39] rounded"
                    style={{ width: width * 0.6, height: 1 }}
                />
            </div>
        )
    }

    // -------------------------------------------------------------------------
    // RENDER: SPARKLINE CHART
    // -------------------------------------------------------------------------
    return (
        <svg
            width={width}
            height={height}
            className="inline-block"
            role="img"
            aria-label={`Price trend for ${symbol}: ${changePercent >= 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(2)}%`}
        >
            {/* Area fill (optional gradient effect) */}
            {showFill && areaPath && (
                <path
                    d={areaPath}
                    fill={colorScheme.fill}
                />
            )}

            {/* Main price line */}
            <path
                d={linePath}
                fill="none"
                stroke={colorScheme.line}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StockSparkline

/**
 * Named export for explicit imports
 * Usage: import { StockSparkline } from '@/components/charts/StockSparkline'
 */
export { StockSparkline }
