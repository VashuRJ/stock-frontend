/**
 * @author Vashu Mogha
 * @version 1.0.0
 */

import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import StockSparkline from '@/components/charts/StockSparkline'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MoverStock {
    symbol: string
    price: number
    change: number
    changePercent: number
    volume?: number
    name?: string
}

interface TopMoversPanelProps {
    /** Array of top gaining stocks */
    gainers: MoverStock[]
    /** Array of top losing stocks */
    losers: MoverStock[]
    /** Loading state */
    loading: boolean
    /** Currently selected index (e.g., "NIFTY50") */
    selectedIndex: string
    /** Callback when index is changed */
    onIndexChange: (index: string) => void
    /** Callback when a stock is selected */
    onStockSelect: (symbol: string) => void
    /** Available indices list */
    indicesList: string[]
    /** Whether market is currently open */
    isMarketOpen: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format price with rupee symbol
 */
const formatPrice = (price: number | undefined): string => {
    if (price === undefined || isNaN(price)) return '₹0.00'
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format percentage with sign
 */
const formatPercent = (percent: number | undefined): string => {
    if (percent === undefined || isNaN(percent)) return '0.00%'
    const sign = percent >= 0 ? '+' : ''
    return `${sign}${percent.toFixed(2)}%`
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MoverCardProps {
    stock: MoverStock
    type: 'gainer' | 'loser'
    onSelect: (symbol: string) => void
}

/**
 * Individual stock card within the movers list
 */
const MoverCard: React.FC<MoverCardProps> = ({ stock, type, onSelect }) => {
    const colorClass = type === 'gainer' ? 'text-[#089981]' : 'text-[#f23645]'

    return (
        <div
            onClick={() => onSelect(stock.symbol)}
            className="flex justify-between items-center p-2.5 mb-1.5 hover:bg-[#2a2e39] rounded-lg cursor-pointer transition-colors gap-3 group"
        >
            {/* Stock Info */}
            <div className="flex-1 min-w-0">
                <span className="text-white font-semibold block truncate text-sm group-hover:text-[#2962ff] transition-colors">
                    {(stock.symbol || '').replace('.NS', '')}
                </span>
                <span className="text-[10px] text-[#787b86]">
                    {formatPrice(stock.price)}
                </span>
            </div>

            {/* Sparkline Chart */}
            <div className="flex-shrink-0">
                <StockSparkline
                    symbol={stock.symbol}
                    changePercent={stock.changePercent}
                    width={100}
                    height={32}
                />
            </div>

            {/* Percentage Change */}
            <span className={`${colorClass} font-bold flex-shrink-0 text-sm min-w-[60px] text-right`}>
                {formatPercent(stock.changePercent)}
            </span>
        </div>
    )
}

interface MoverListProps {
    stocks: MoverStock[]
    type: 'gainer' | 'loser'
    loading: boolean
    onSelect: (symbol: string) => void
}

/**
 * List of movers (either gainers or losers)
 */
const MoverList: React.FC<MoverListProps> = ({ stocks, type, loading, onSelect }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-32 text-xs text-[#787b86]">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#2962ff] border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        )
    }

    if (stocks.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-xs text-[#787b86]">
                No movers available
            </div>
        )
    }

    return (
        <div className="space-y-0.5">
            {stocks.map((stock, index) => (
                <MoverCard
                    key={stock.symbol || `${type}-${index}`}
                    stock={stock}
                    type={type}
                    onSelect={onSelect}
                />
            ))}
        </div>
    )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TopMoversPanel: React.FC<TopMoversPanelProps> = ({
    gainers,
    losers,
    loading,
    selectedIndex,
    onIndexChange,
    onStockSelect,
    indicesList,
    isMarketOpen
}) => {
    return (
        <div className="space-y-3">
            {/* Header with Index Selector */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-xs text-[#787b86]">Index:</label>
                    <select
                        value={selectedIndex}
                        onChange={(e) => onIndexChange(e.target.value)}
                        className="bg-[#1e222d] border border-[#2a2e39] px-2 py-1.5 rounded-lg text-sm text-white focus:border-[#2962ff] outline-none cursor-pointer transition-colors"
                    >
                        {indicesList.map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    {loading && (
                        <span className="text-xs text-[#787b86] animate-pulse">Loading...</span>
                    )}
                </div>
                <div className="text-xs text-[#787b86]">
                    {isMarketOpen ? (
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#089981] rounded-full animate-pulse" />
                            Live movers
                        </span>
                    ) : (
                        'Last close movers'
                    )}
                </div>
            </div>

            {/* Gainers & Losers Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Top Gainers */}
                <div className="bg-[#131722] rounded-xl border border-[#2a2e39] overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-[#2a2e39] bg-[#1e222d] flex items-center gap-2">
                        <TrendingUp size={16} className="text-[#089981]" />
                        <h3 className="font-bold text-white text-xs uppercase tracking-wide">Top Gainers</h3>
                        {!loading && (
                            <span className="text-[10px] text-[#787b86] ml-auto">{gainers.length} stocks</span>
                        )}
                    </div>
                    <div className="p-2 overflow-y-auto flex-1 max-h-[280px] scrollbar-thin scrollbar-thumb-[#2a2e39] scrollbar-track-transparent">
                        <MoverList
                            stocks={gainers}
                            type="gainer"
                            loading={loading}
                            onSelect={onStockSelect}
                        />
                    </div>
                </div>

                {/* Top Losers */}
                <div className="bg-[#131722] rounded-xl border border-[#2a2e39] overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-[#2a2e39] bg-[#1e222d] flex items-center gap-2">
                        <TrendingDown size={16} className="text-[#f23645]" />
                        <h3 className="font-bold text-white text-xs uppercase tracking-wide">Top Losers</h3>
                        {!loading && (
                            <span className="text-[10px] text-[#787b86] ml-auto">{losers.length} stocks</span>
                        )}
                    </div>
                    <div className="p-2 overflow-y-auto flex-1 max-h-[280px] scrollbar-thin scrollbar-thumb-[#2a2e39] scrollbar-track-transparent">
                        <MoverList
                            stocks={losers}
                            type="loser"
                            loading={loading}
                            onSelect={onStockSelect}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TopMoversPanel
export { TopMoversPanel, MoverCard, MoverList }
export type { TopMoversPanelProps, MoverCardProps, MoverListProps }

