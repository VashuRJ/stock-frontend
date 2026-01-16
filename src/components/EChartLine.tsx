import React, { useEffect, useRef } from 'react';
import {
    createChart,
    IChartApi,
    ISeriesApi,
    LineSeries,
    AreaSeries,
    LineData,
    Time,
    CrosshairMode
} from 'lightweight-charts';

// --- Types ---
type Point = {
    time: string;
    timestamp?: number;
    price?: number;
    close?: number;
    sma?: number;
    ema?: number;
};

interface EChartLineProps {
    data: Point[];
    showSMA?: boolean;
    showEMA?: boolean;
}

// Helper: Convert date string to timestamp
const parseTime = (timeStr: string, timestamp?: number): Time => {
    // If timestamp is provided directly, use it
    if (timestamp && timestamp > 0) {
        // Convert milliseconds to seconds if needed
        const ts = timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp;
        return ts as Time;
    }

    // Handle "HH:MM" format (intraday)
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        const now = new Date();
        const [hours, minutes] = timeStr.split(':').map(Number);
        now.setHours(hours, minutes, 0, 0);
        return Math.floor(now.getTime() / 1000) as Time;
    }

    // Handle "Mon DD" or "Jan 12" format
    if (/^[A-Za-z]{3}\s+\d{1,2}$/.test(timeStr)) {
        const now = new Date();
        const [monthStr, day] = timeStr.split(/\s+/);
        const months: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = months[monthStr] ?? now.getMonth();
        const year = now.getFullYear();
        const date = new Date(year, month, parseInt(day));
        return Math.floor(date.getTime() / 1000) as Time;
    }

    // Handle various date formats
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000) as Time;
    }

    // Fallback: try to parse as YYYY-MM-DD
    const parts = timeStr.split(/[-/T]/);
    if (parts.length >= 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        return Math.floor(new Date(year, month - 1, day).getTime() / 1000) as Time;
    }

    return 0 as Time;
};

export default function EChartLine({
    data,
    showSMA = false,
    showEMA = false,
}: EChartLineProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const lineSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
    const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    // Memoize processed data
    const processedData = React.useMemo(() => {
        if (!data || data.length === 0) {
            return null;
        }

        // Sort data by time and remove duplicates
        const sortedData = [...data].sort((a, b) => {
            const timeA = parseTime(a.time, a.timestamp);
            const timeB = parseTime(b.time, b.timestamp);
            return (timeA as number) - (timeB as number);
        });

        // Remove duplicates by time
        const uniqueData: Point[] = [];
        const seenTimes = new Set<number>();
        for (const item of sortedData) {
            const time = parseTime(item.time, item.timestamp) as number;
            if (time > 0 && !seenTimes.has(time)) {
                seenTimes.add(time);
                uniqueData.push(item);
            }
        }

        // Process line data
        const lineData: LineData<Time>[] = [];
        const smaData: LineData<Time>[] = [];
        const emaData: LineData<Time>[] = [];

        for (const item of uniqueData) {
            const time = parseTime(item.time, item.timestamp);
            if (!time || time === 0) continue;

            const price = item.price ?? item.close;
            if (price === undefined || isNaN(price) || price <= 0) continue;

            lineData.push({ time, value: price });

            // SMA data
            if (item.sma !== undefined && item.sma !== null && !isNaN(item.sma)) {
                smaData.push({ time, value: item.sma });
            }

            // EMA data
            if (item.ema !== undefined && item.ema !== null && !isNaN(item.ema)) {
                emaData.push({ time, value: item.ema });
            }
        }

        return { lineData, smaData, emaData };
    }, [data]);

    // Initialize chart ONCE
    useEffect(() => {
        if (!chartContainerRef.current || chartRef.current) return;

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2a2e39' },
                horzLines: { color: '#2a2e39' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: '#787b86',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#2962ff',
                },
                horzLine: {
                    color: '#787b86',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#2962ff',
                },
            },
            rightPriceScale: {
                borderColor: '#2a2e39',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
                autoScale: false, // Disable autoScale for manual panning
                mode: 0,
            },
            timeScale: {
                borderColor: '#2a2e39',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                barSpacing: 8,
                minBarSpacing: 2,
                fixLeftEdge: false,
                fixRightEdge: false,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: {
                    time: true,
                    price: true,
                },
                axisDoubleClickReset: {
                    time: true,
                    price: true,
                },
                mouseWheel: true,
                pinch: true,
            },
            kineticScroll: {
                touch: true,
                mouse: true,
            },
        });

        chartRef.current = chart;

        // Create area series for main line
        const lineSeries = chart.addSeries(AreaSeries, {
            lineColor: '#2962ff',
            topColor: 'rgba(41, 98, 255, 0.3)',
            bottomColor: 'rgba(41, 98, 255, 0)',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
        });
        lineSeriesRef.current = lineSeries;

        // Create SMA series
        const smaSeries = chart.addSeries(LineSeries, {
            color: '#ff9800',
            lineWidth: 2,
            title: 'SMA',
            priceLineVisible: false,
            lastValueVisible: true,
            lineStyle: 2, // Dashed
        });
        smaSeriesRef.current = smaSeries;

        // Create EMA series
        const emaSeries = chart.addSeries(LineSeries, {
            color: '#2196f3',
            lineWidth: 2,
            title: 'EMA',
            priceLineVisible: false,
            lastValueVisible: true,
            lineStyle: 2, // Dashed
        });
        emaSeriesRef.current = emaSeries;

        // Setup resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries.length === 0 || !chartContainerRef.current) return;
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });

        resizeObserver.observe(chartContainerRef.current);
        resizeObserverRef.current = resizeObserver;

        // Cleanup
        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            lineSeriesRef.current = null;
            smaSeriesRef.current = null;
            emaSeriesRef.current = null;
        };
    }, []);

    // Update data
    useEffect(() => {
        if (!chartRef.current || !processedData) return;

        const chart = chartRef.current;

        // Update line data
        if (lineSeriesRef.current) {
            lineSeriesRef.current.setData(processedData.lineData);
        }

        // Update SMA data
        if (smaSeriesRef.current) {
            if (showSMA && processedData.smaData.length > 0) {
                smaSeriesRef.current.setData(processedData.smaData);
                smaSeriesRef.current.applyOptions({ visible: true });
            } else {
                smaSeriesRef.current.setData([]);
                smaSeriesRef.current.applyOptions({ visible: false });
            }
        }

        // Update EMA data
        if (emaSeriesRef.current) {
            if (showEMA && processedData.emaData.length > 0) {
                emaSeriesRef.current.setData(processedData.emaData);
                emaSeriesRef.current.applyOptions({ visible: true });
            } else {
                emaSeriesRef.current.setData([]);
                emaSeriesRef.current.applyOptions({ visible: false });
            }
        }

        // Fit content
        chart.timeScale().fitContent();
    }, [processedData, showSMA, showEMA]);

    // Reset zoom handler
    const handleResetZoom = React.useCallback(() => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
    }, []);

    // No data fallback
    if (!data || data.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#131722] text-gray-400">
                <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <div>No chart data available</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative bg-[#131722]">
            {/* Chart Container */}
            <div
                ref={chartContainerRef}
                className="w-full h-full"
                style={{ minHeight: '300px' }}
            />

            {/* Reset Zoom Button */}
            <button
                onClick={handleResetZoom}
                className="absolute bottom-2 right-2 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 z-10"
                style={{
                    backgroundColor: '#1e222d',
                    border: '1px solid #2a2e39',
                    color: '#9aa0af',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2962ff';
                    e.currentTarget.style.color = '#2962ff';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2e39';
                    e.currentTarget.style.color = '#9aa0af';
                }}
                title="Reset Zoom (Double-click chart)"
            >
                ⟲ Reset
            </button>

            {/* Legend */}
            <div
                className="absolute top-2 left-2 flex flex-wrap gap-3 text-xs z-10 bg-[#131722]/80 px-2 py-1 rounded"
                style={{ color: '#9aa0af' }}
            >
                <span style={{ color: '#2962ff' }}>● Price</span>
                {showSMA && processedData?.smaData && processedData.smaData.length > 0 && (
                    <span style={{ color: '#ff9800' }}>● SMA(20)</span>
                )}
                {showEMA && processedData?.emaData && processedData.emaData.length > 0 && (
                    <span style={{ color: '#2196f3' }}>● EMA(12)</span>
                )}
            </div>
        </div>
    );
}
