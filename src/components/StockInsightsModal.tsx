import React, { useEffect, useState } from 'react'
import { X, TrendingUp, TrendingDown, Activity, AlertTriangle, Brain, Target } from 'lucide-react'
import { api } from '@/api/client'

interface StockInsightsModalProps {
    symbol: string
    onClose: () => void
}

interface InsightData {
    autoInsight: string
    momentum: {
        momentum: string
        percent_change: number
    } | null
    volatility: {
        volatility_percent: number
        level: string
    } | null
    alerts: string[]
    aiInsight: {
        ai_insight: string
    } | null
    decision: {
        decision: string
        sma5: number
        momentum: string
        today_close: number
    } | null
}

const StockInsightsModal: React.FC<StockInsightsModalProps> = ({ symbol, onClose }) => {
    const [loading, setLoading] = useState(true)
    const [insights, setInsights] = useState<InsightData | null>(null)

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                setLoading(true)

                // Fetch all insights in parallel with better error handling
                const [autoRes, momentumRes, volatilityRes, alertsRes, aiRes, decisionRes] = await Promise.allSettled([
                    api.get(`/insights/${symbol}`),
                    api.get(`/insights/momentum/${symbol}`),
                    api.get(`/insights/volatility/${symbol}`),
                    api.get(`/insights/alerts/${symbol}`),
                    api.get(`/insights/ai/${symbol}`),
                    api.get(`/insights/decision/${symbol}`)
                ])

                setInsights({
                    autoInsight: autoRes.status === 'fulfilled' ? autoRes.value.data.insight || 'N/A' : 'N/A',
                    momentum: momentumRes.status === 'fulfilled' ? momentumRes.value.data : null,
                    volatility: volatilityRes.status === 'fulfilled' ? volatilityRes.value.data : null,
                    alerts: alertsRes.status === 'fulfilled' ? alertsRes.value.data.alerts || [] : [],
                    aiInsight: aiRes.status === 'fulfilled' ? aiRes.value.data : null,
                    decision: decisionRes.status === 'fulfilled' ? decisionRes.value.data : null
                })
            } catch (err) {
                console.error('Failed to fetch insights:', err)
                // Set empty insights on error to prevent crashes
                setInsights({
                    autoInsight: 'Unable to load insights',
                    momentum: null,
                    volatility: null,
                    alerts: [],
                    aiInsight: null,
                    decision: null
                })
            } finally {
                setLoading(false)
            }
        }

        fetchInsights()
    }, [symbol])

    const getDecisionColor = (decision?: string) => {
        if (!decision) return 'text-gray-400'
        if (decision.includes('Buy')) return 'text-green-400'
        if (decision.includes('Sell')) return 'text-red-400'
        return 'text-yellow-400'
    }

    const getDecisionBg = (decision?: string) => {
        if (!decision) return 'bg-gray-500/20'
        if (decision.includes('Buy')) return 'bg-green-500/20'
        if (decision.includes('Sell')) return 'bg-red-500/20'
        return 'bg-yellow-500/20'
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-[#2a2e39] flex items-center justify-between bg-gradient-to-r from-[#1e222d] to-[#131722]">
                    <div>
                        <h3 className="text-white font-bold text-lg">{symbol.replace('.NS', '')} Insights</h3>
                        <p className="text-[#787b86] text-xs">AI-powered stock analysis</p>
                    </div>
                    <button className="text-[#787b86] hover:text-white transition-colors" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2962ff]"></div>
                        </div>
                    ) : insights ? (
                        <>
                            {/* Buy/Sell/Hold Decision */}
                            {insights.decision && (
                                <div className={`${getDecisionBg(insights.decision.decision)} rounded-xl p-4 border border-[#2a2e39]`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Target className={getDecisionColor(insights.decision.decision)} size={24} />
                                        <h4 className="text-white font-bold text-base">Trading Recommendation</h4>
                                    </div>
                                    <div className={`text-2xl font-bold ${getDecisionColor(insights.decision.decision)} mb-2`}>
                                        {insights.decision.decision}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span className="text-[#787b86]">Current: </span>
                                            <span className="text-white font-semibold">₹{insights.decision.today_close}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#787b86]">SMA(5): </span>
                                            <span className="text-white font-semibold">₹{insights.decision.sma5}</span>
                                        </div>
                                        <div>
                                            <span className="text-[#787b86]">Momentum: </span>
                                            <span className="text-white font-semibold capitalize">{insights.decision.momentum}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Insight */}
                            {insights.aiInsight && (
                                <div className="bg-[#1e222d] rounded-xl p-4 border border-[#2a2e39]">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Brain className="text-purple-400" size={20} />
                                        <h4 className="text-white font-bold text-sm">AI Analysis</h4>
                                    </div>
                                    <p className="text-[#d1d4dc] text-sm leading-relaxed">
                                        {typeof insights.aiInsight === 'string'
                                            ? insights.aiInsight
                                            : insights.aiInsight.ai_insight || 'No AI analysis available'}
                                    </p>
                                </div>
                            )}

                            {/* Momentum & Volatility */}
                            <div className="grid grid-cols-2 gap-4">
                                {insights.momentum && (
                                    <div className="bg-[#1e222d] rounded-xl p-4 border border-[#2a2e39]">
                                        <div className="flex items-center gap-2 mb-2">
                                            {insights.momentum.momentum === 'Positive' ? (
                                                <TrendingUp className="text-green-400" size={18} />
                                            ) : (
                                                <TrendingDown className="text-red-400" size={18} />
                                            )}
                                            <h4 className="text-white font-bold text-sm">Momentum</h4>
                                        </div>
                                        <div className={`text-lg font-bold ${insights.momentum.momentum === 'Positive' ? 'text-green-400' : 'text-red-400'}`}>
                                            {insights.momentum.momentum}
                                        </div>
                                        <div className="text-xs text-[#787b86] mt-1">
                                            7-day change: {insights.momentum.percent_change > 0 ? '+' : ''}{insights.momentum.percent_change}%
                                        </div>
                                    </div>
                                )}

                                {insights.volatility && (
                                    <div className="bg-[#1e222d] rounded-xl p-4 border border-[#2a2e39]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="text-orange-400" size={18} />
                                            <h4 className="text-white font-bold text-sm">Volatility</h4>
                                        </div>
                                        <div className={`text-lg font-bold ${insights.volatility.level === 'High' ? 'text-red-400' :
                                            insights.volatility.level === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                                            }`}>
                                            {insights.volatility.level}
                                        </div>
                                        <div className="text-xs text-[#787b86] mt-1">
                                            {insights.volatility.volatility_percent}% volatility
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Trend Insight */}
                            <div className="bg-[#1e222d] rounded-xl p-4 border border-[#2a2e39]">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="text-blue-400" size={18} />
                                    <h4 className="text-white font-bold text-sm">Trend Analysis</h4>
                                </div>
                                <p className="text-[#d1d4dc] text-sm">{insights.autoInsight}</p>
                            </div>

                            {/* Alerts */}
                            {insights.alerts.length > 0 && (
                                <div className="bg-[#1e222d] rounded-xl p-4 border border-[#2a2e39]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="text-yellow-400" size={18} />
                                        <h4 className="text-white font-bold text-sm">Price Alerts</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {insights.alerts.map((alert, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-[#d1d4dc] bg-[#131722] p-2 rounded">
                                                <span className="text-yellow-400">•</span>
                                                {alert}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-[#787b86]">Failed to load insights</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#2a2e39] bg-[#1e222d]">
                    <p className="text-[10px] text-[#787b86] text-center">
                        ⚠️ This is AI-generated analysis for informational purposes only. Not financial advice.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default StockInsightsModal
