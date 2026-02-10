/**
 * AI Pattern Matcher - Streamlined Version
 * 
 * Analyzes the CURRENT dashboard stock automatically (like SmartPeriodCompare).
 * User only selects: Exchange + Period
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    X, Brain, Camera, Info, RotateCcw, Maximize2, Minimize2,
    ChevronRight, Activity, Calendar, Zap
} from 'lucide-react';
import {
    createChart,
    IChartApi,
    ISeriesApi,
    LineData,
    Time,
    CrosshairMode,
    LineSeries
} from 'lightweight-charts';
import html2canvas from 'html2canvas';

interface PeriodDataPoint {
    day: number;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change_pct: number | null;
}

interface PeriodSummary {
    label: string;
    start_date: string;
    end_date: string;
    total_days: number;
    start_price: number;
    end_price: number;
    period_return_pct: number;
    avg_price: number;
    min_price: number;
    max_price: number;
}

interface PeriodData {
    label: string;
    summary: PeriodSummary;
    data: PeriodDataPoint[];
}

interface PatternMatchResponse {
    success: boolean;
    stock_symbol: string;
    exchange: string;
    match_percentage: number;
    correlation: number;
    current_period: PeriodData;
    matched_period: PeriodData;
    message: string;
    insights: string[];
}

interface PatternMatcherProps {
    symbol: string; // Stock from dashboard
    onClose: () => void;
}

// Period presets
const PERIOD_PRESETS = [
    { label: '1W', days: 7, description: '1 Week' },
    { label: '2W', days: 14, description: '2 Weeks' },
    { label: '1M', days: 30, description: '1 Month' },
    { label: '2M', days: 60, description: '2 Months' },
    { label: '3M', days: 90, description: '3 Months' },
    { label: '6M', days: 180, description: '6 Months' },
];

export default function PatternMatcher({ symbol, onClose }: PatternMatcherProps) {
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');

    // Configuration
    const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE');
    const [selectedPreset, setSelectedPreset] = useState<number>(30);
    const [customDays, setCustomDays] = useState<string>('');

    // Results
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<PatternMatchResponse | null>(null);
    const [error, setError] = useState<string>('');

    // UI states
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [chartMode, setChartMode] = useState<'percent' | 'price'>('percent');

    // Refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const reportContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const currentSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const matchedSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

    const activeDays = customDays ? parseInt(customDays) || 30 : selectedPreset;

    const getMatchColor = (pct: number): string => {
        if (pct >= 90) return '#10b981';
        if (pct >= 75) return '#34d399';
        if (pct >= 60) return '#fbbf24';
        if (pct >= 45) return '#f97316';
        return '#ef4444';
    };

    const getMatchLabel = (pct: number): string => {
        if (pct >= 90) return 'Excellent';
        if (pct >= 75) return 'Very Good';
        if (pct >= 60) return 'Good';
        if (pct >= 45) return 'Moderate';
        return 'Low';
    };

    const handlePresetClick = (days: number) => {
        setSelectedPreset(days);
        setCustomDays('');
    };

    const handleCustomDaysChange = (value: string) => {
        const numValue = parseInt(value);
        if (value === '' || (numValue >= 7 && numValue <= 365)) {
            setCustomDays(value);
            if (numValue >= 7) {
                setSelectedPreset(0);
            }
        }
    };

    const runAnalysis = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(
                `http://localhost:8000/pattern/match/${cleanSymbol}?exchange=${exchange}&period_days=${activeDays}`
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to fetch pattern match');
            }

            const data: PatternMatchResponse = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSnapshot = async () => {
        if (!reportContainerRef.current) return;
        try {
            const canvas = await html2canvas(reportContainerRef.current, {
                background: '#0d1117',
                scale: 2,
                logging: false,
            } as any);
            const link = document.createElement('a');
            link.download = `${cleanSymbol}_pattern_${exchange}_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Snapshot failed:", err);
        }
    };

    const handleReset = () => {
        setResult(null);
        setError('');
    };

    // Auto-run on mount
    useEffect(() => {
        runAnalysis();
    }, []);

    // Chart initialization
    useEffect(() => {
        if (!chartContainerRef.current || !result?.current_period || !result?.matched_period) {
            return;
        }

        // Cleanup previous chart instance if it exists
        if (chartRef.current) {
            try {
                chartRef.current.remove();
            } catch (e) {
                // Chart already disposed, ignore
            }
            chartRef.current = null;
            currentSeriesRef.current = null;
            matchedSeriesRef.current = null;
        }

        const container = chartContainerRef.current;
        const { width, height } = container.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'absolute pointer-events-none z-50 bg-[#1e222d]/95 backdrop-blur-sm border border-[#2a2e39] rounded-xl p-3 text-xs text-white shadow-2xl';
        tooltip.style.display = 'none';
        tooltip.style.minWidth = '220px';
        container.appendChild(tooltip);

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
                vertLine: { color: '#58a6ff', width: 1, style: 2, labelBackgroundColor: '#1f6feb' },
                horzLine: { color: '#58a6ff', width: 1, style: 2, labelBackgroundColor: '#1f6feb' },
            },
            rightPriceScale: { borderColor: '#21262d', scaleMargins: { top: 0.1, bottom: 0.1 } },
            timeScale: { borderColor: '#21262d', timeVisible: false, rightOffset: 5, barSpacing: 12 },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale: { mouseWheel: true, pinch: true },
        });

        chartRef.current = chart;

        const currentSeries = chart.addSeries(LineSeries, {
            color: '#58a6ff',
            lineWidth: 3,
            lastValueVisible: true,
            priceLineVisible: true,
        });
        currentSeriesRef.current = currentSeries;

        const matchedSeries = chart.addSeries(LineSeries, {
            color: '#f0883e',
            lineWidth: 3,
            lastValueVisible: true,
            priceLineVisible: true,
        });
        matchedSeriesRef.current = matchedSeries;

        const currentData: LineData<Time>[] = result.current_period.data.map((d, idx) => ({
            time: ((idx + 1) * 86400) as Time,
            value: chartMode === 'percent' ? (d.change_pct ?? 0) : d.close,
        }));

        const matchedData: LineData<Time>[] = result.matched_period.data.map((d, idx) => ({
            time: ((idx + 1) * 86400) as Time,
            value: chartMode === 'percent' ? (d.change_pct ?? 0) : d.close,
        }));

        currentSeries.setData(currentData);
        matchedSeries.setData(matchedData);
        chart.timeScale().fitContent();

        chart.subscribeCrosshairMove((param) => {
            if (!param.time || !param.point) {
                tooltip.style.display = 'none';
                return;
            }

            const dayIndex = Math.floor((param.time as number) / 86400);
            const dataIndex = dayIndex - 1;

            const currData = result.current_period.data[dataIndex];
            const matchData = result.matched_period.data[dataIndex];

            if (!currData && !matchData) {
                tooltip.style.display = 'none';
                return;
            }

            let tooltipHTML = `
                <div class="font-bold text-white mb-2 pb-2 border-b border-[#30363d]">
                    <div class="text-xs mb-1 opacity-70">Day ${dayIndex}</div>
                    <div class="flex items-center gap-2 text-sm">
                        <span class="text-[#58a6ff]">${currData?.date || 'N/A'}</span>
                        <span class="text-[#8b949e]">vs</span>
                        <span class="text-[#f0883e]">${matchData?.date || 'N/A'}</span>
                    </div>
                </div>
            `;

            if (currData) {
                const val = chartMode === 'percent' ? (currData.change_pct ?? 0) : currData.close;
                tooltipHTML += `
                    <div class="mb-2">
                        <div class="flex items-center gap-2 mb-0.5">
                            <div class="w-2.5 h-2.5 rounded-full bg-[#58a6ff]"></div>
                            <span class="text-[#58a6ff] font-semibold text-xs">Current</span>
                        </div>
                        <div class="ml-4.5 font-mono font-bold text-sm ${val >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}">
                            ${chartMode === 'percent' ? val.toFixed(2) + '%' : '₹' + val.toFixed(2)}
                        </div>
                    </div>
                `;
            }

            if (matchData) {
                const val = chartMode === 'percent' ? (matchData.change_pct ?? 0) : matchData.close;
                tooltipHTML += `
                    <div>
                        <div class="flex items-center gap-2 mb-0.5">
                            <div class="w-2.5 h-2.5 rounded-full bg-[#f0883e]"></div>
                            <span class="text-[#f0883e] font-semibold text-xs">AI Match</span>
                        </div>
                        <div class="ml-4.5 font-mono font-bold text-sm ${val >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}">
                            ${chartMode === 'percent' ? val.toFixed(2) + '%' : '₹' + val.toFixed(2)}
                        </div>
                    </div>
                `;
            }

            tooltip.innerHTML = tooltipHTML;
            tooltip.style.display = 'block';

            const tooltipWidth = 240;
            const tooltipHeight = tooltip.offsetHeight;
            const padding = 15;

            let left = param.point.x + padding;
            let top = param.point.y - tooltipHeight / 2;

            if (left + tooltipWidth > width) left = param.point.x - tooltipWidth - padding;
            if (top < 0) top = padding;
            if (top + tooltipHeight > height) top = height - tooltipHeight - padding;

            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        });

        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = container.getBoundingClientRect();
            if (width > 0 && height > 0) chart.applyOptions({ width, height });
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            if (tooltip && tooltip.parentNode) {
                tooltip.remove();
            }
            if (chartRef.current) {
                try {
                    chartRef.current.remove();
                } catch (e) {
                    // Chart already disposed, ignore
                }
                chartRef.current = null;
            }
        };
    }, [result, chartMode]);

    return (
        <div className={`fixed inset-0 bg-black/90 backdrop-blur-md z-[10000] flex items-center justify-center ${isFullscreen ? '' : 'p-4'}`}>
            <div className={`bg-[#0d1117] overflow-hidden shadow-2xl border border-[#30363d] transition-all duration-300 ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl max-h-[95vh] rounded-2xl'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#21262d] bg-gradient-to-r from-[#161b22] to-[#0d1117]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                            <Brain className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                AI Pattern Matcher
                                <span className="px-2 py-0.5 bg-[#238636] text-white text-[10px] rounded-full font-medium">
                                    {cleanSymbol}
                                </span>
                            </h2>
                            <p className="text-xs text-[#8b949e]">
                                Find similar historical price patterns using AI
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {result && (
                            <>
                                <button
                                    onClick={handleDownloadSnapshot}
                                    className="p-2 hover:bg-[#21262d] rounded-lg transition-colors text-[#8b949e] hover:text-white"
                                    title="Download Snapshot"
                                >
                                    <Camera size={16} />
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="p-2 hover:bg-[#21262d] rounded-lg transition-colors text-[#8b949e] hover:text-white flex items-center gap-1.5 text-sm"
                                >
                                    <RotateCcw size={16} />
                                    <span>New Analysis</span>
                                </button>
                            </>
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

                {/* Content */}
                <div className="p-5 overflow-y-auto" style={{ maxHeight: isFullscreen ? 'calc(100vh - 80px)' : 'calc(95vh - 80px)' }} ref={reportContainerRef}>
                    {!result && !loading && (
                        <div className="space-y-5">
                            {/* Exchange + Period Config */}
                            <div className="bg-[#161b22] rounded-xl p-5 border border-[#21262d]">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Zap size={18} className="text-indigo-400" />
                                    Configuration
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Exchange */}
                                    <div>
                                        <label className="text-sm text-[#8b949e] mb-2 block">Exchange</label>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setExchange('NSE')}
                                                className={`flex-1 px-6 py-3 text-sm font-bold rounded-lg transition-all ${exchange === 'NSE'
                                                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                                                    : 'bg-[#0d1117] text-[#8b949e] hover:bg-[#21262d] border border-[#30363d]'
                                                    }`}
                                            >
                                                NSE
                                            </button>
                                            <button
                                                onClick={() => setExchange('BSE')}
                                                className={`flex-1 px-6 py-3 text-sm font-bold rounded-lg transition-all ${exchange === 'BSE'
                                                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                                                    : 'bg-[#0d1117] text-[#8b949e] hover:bg-[#21262d] border border-[#30363d]'
                                                    }`}
                                            >
                                                BSE
                                            </button>
                                        </div>
                                    </div>

                                    {/* Period */}
                                    <div>
                                        <label className="text-sm text-[#8b949e] mb-2 block">Analysis Period</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {PERIOD_PRESETS.map(preset => (
                                                <button
                                                    key={preset.days}
                                                    onClick={() => handlePresetClick(preset.days)}
                                                    className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${selectedPreset === preset.days && !customDays
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-[#0d1117] text-[#8b949e] hover:bg-[#21262d]'
                                                        }`}
                                                    title={preset.description}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Days */}
                                <div className="mt-4 flex items-center gap-3">
                                    <span className="text-sm text-[#8b949e]">Custom:</span>
                                    <input
                                        type="number"
                                        placeholder="Days (7-365)"
                                        className="flex-1 px-4 py-2 bg-[#0d1117] text-white border border-[#30363d] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        value={customDays}
                                        onChange={(e) => handleCustomDaysChange(e.target.value)}
                                        min="7"
                                        max="365"
                                    />
                                    <span className="text-sm text-[#8b949e] font-mono min-w-[80px]">{activeDays} days</span>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg">
                                    <Info size={20} className="text-[#f85149]" />
                                    <p className="text-[#f85149]">{error}</p>
                                </div>
                            )}

                            {/* Run Button */}
                            <button
                                onClick={runAnalysis}
                                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg"
                            >
                                <Brain size={24} />
                                Run AI Pattern Analysis
                            </button>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="p-12 flex flex-col items-center justify-center">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                                <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-400" size={24} />
                            </div>
                            <p className="text-[#8b949e] mt-4 font-medium">Analyzing {activeDays} day pattern for {cleanSymbol} on {exchange}...</p>
                            <p className="text-[#8b949e]/60 text-sm mt-2">Scanning up to 5 years of historical data...</p>
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="space-y-5">
                            {/* Chart */}
                            <div className="bg-[#161b22] rounded-xl p-5 border border-[#21262d]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <Activity className="text-purple-400" size={20} />
                                        Pattern Comparison Chart
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setChartMode('percent')}
                                            className={`px-3 py-1 text-xs font-bold rounded ${chartMode === 'percent' ? 'bg-[#1f6feb] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}
                                        >
                                            % Change
                                        </button>
                                        <button
                                            onClick={() => setChartMode('price')}
                                            className={`px-3 py-1 text-xs font-bold rounded ${chartMode === 'price' ? 'bg-[#1f6feb] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}
                                        >
                                            Price (₹)
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mb-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-[#58a6ff]"></div>
                                        <span className="text-[#8b949e]">Current Period</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-[#f0883e]"></div>
                                        <span className="text-[#8b949e]">AI Matched Period</span>
                                    </div>
                                </div>
                                <div ref={chartContainerRef} className="relative w-full h-[400px]"></div>
                            </div>

                            {/* Match Score & Stats */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                <div className="p-6 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/30">
                                    <div className="text-center">
                                        <p className="text-sm text-[#8b949e] mb-2">AI Match Score</p>
                                        <div className="text-6xl font-bold mb-4" style={{ color: getMatchColor(result.match_percentage) }}>
                                            {result.match_percentage.toFixed(1)}%
                                        </div>
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: `${getMatchColor(result.match_percentage)}20`, color: getMatchColor(result.match_percentage) }}>
                                            <Zap size={16} />
                                            <span className="font-semibold">{getMatchLabel(result.match_percentage)}</span>
                                        </div>
                                        <p className="text-xs text-[#8b949e] mt-3">Correlation: {result.correlation.toFixed(3)}</p>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-xl border border-blue-500/30">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-3 h-3 rounded-full bg-[#58a6ff]"></div>
                                            <span className="text-xs font-semibold text-blue-400">CURRENT PERIOD</span>
                                        </div>
                                        <p className="text-sm text-[#8b949e] mb-2">{result.current_period.label}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-[#0d1117]/50 rounded p-2">
                                                <span className="text-[10px] text-[#8b949e] block">Return</span>
                                                <p className={`font-mono font-bold ${result.current_period.summary.period_return_pct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                                    {result.current_period.summary.period_return_pct >= 0 ? '+' : ''}{result.current_period.summary.period_return_pct}%
                                                </p>
                                            </div>
                                            <div className="bg-[#0d1117]/50 rounded p-2">
                                                <span className="text-[10px] text-[#8b949e] block">Days</span>
                                                <p className="font-mono text-white font-bold">{result.current_period.summary.total_days}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gradient-to-br from-orange-900/20 to-orange-800/20 rounded-xl border border-orange-500/30">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-3 h-3 rounded-full bg-[#f0883e]"></div>
                                            <span className="text-xs font-semibold text-orange-400">AI MATCHED</span>
                                        </div>
                                        <p className="text-sm text-[#8b949e] mb-2">{result.matched_period.label}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-[#0d1117]/50 rounded p-2">
                                                <span className="text-[10px] text-[#8b949e] block">Return</span>
                                                <p className={`font-mono font-bold ${result.matched_period.summary.period_return_pct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                                                    {result.matched_period.summary.period_return_pct >= 0 ? '+' : ''}{result.matched_period.summary.period_return_pct}%
                                                </p>
                                            </div>
                                            <div className="bg-[#0d1117]/50 rounded p-2">
                                                <span className="text-[10px] text-[#8b949e] block">Days</span>
                                                <p className="font-mono text-white font-bold">{result.matched_period.summary.total_days}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Insights */}
                            {result.insights && result.insights.length > 0 && (
                                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-5 border border-indigo-500/30">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Brain className="text-indigo-400" size={24} />
                                        <h3 className="text-lg font-bold text-white">AI Analysis & Insights</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {result.insights.map((insight, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 bg-[#0d1117]/50 rounded-lg border border-indigo-500/20">
                                                <Info size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-[#d1d4dc]">{insight}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Message */}
                            <div className="p-4 bg-green-900/10 border border-green-600/30 rounded-lg">
                                <p className="text-green-400 text-sm font-medium">{result.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
