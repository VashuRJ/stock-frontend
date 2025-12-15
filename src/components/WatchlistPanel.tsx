import React from 'react'
import { StockData, WatchlistItem } from '@/types/stocks'
import { ChevronDown, ChevronRight, Pencil, Trash2, X, CheckCircle2 } from 'lucide-react'

interface WatchlistPanelProps {
  allWatchlists: WatchlistItem[]
  currentWatchlist: WatchlistItem | null
  expandedWatchlistId: number | null
  watchlistLoading: boolean
  watchlistData: StockData[]
  renamingWatchlistId: number | null
  renameValue: string
  onRenameChange: (val: string) => void
  onToggleExpand: (wl: WatchlistItem) => void
  onRenameClick: (wl: WatchlistItem) => void
  onDeleteClick: (wl: WatchlistItem) => void
  onCreateClick: () => void
  onRemoveSymbol: (symbol: string) => void
  onSelectSymbol: (symbol: string) => void
  cleanCompanyName: (name?: string) => string | undefined
  getColor: (val: number) => string
}

export function WatchlistPanel(props: WatchlistPanelProps) {
  const {
    allWatchlists,
    currentWatchlist,
    expandedWatchlistId,
    watchlistLoading,
    watchlistData,
    renamingWatchlistId,
    renameValue,
    onRenameChange,
    onToggleExpand,
    onRenameClick,
    onDeleteClick,
    onCreateClick,
    onRemoveSymbol,
    onSelectSymbol,
    cleanCompanyName,
    getColor,
  } = props

  return (
    <div className="bg-[#0f1118] rounded-xl border border-[#1f2330] flex flex-col shadow-lg h-[40%] overflow-hidden">
      <div className="p-3">
        <button
          onClick={onCreateClick}
          className="w-full bg-[#2a2e39] hover:bg-[#1e222d] text-white font-semibold py-2 rounded-md border border-[#3a3f4f] transition-colors text-sm"
        >
          + New Watchlist
        </button>
      </div>

      <div className="overflow-y-auto px-2 pb-3 flex-1 space-y-2">
        {allWatchlists.length === 0 && (
          <div className="text-center text-xs text-[#787b86] py-6">No watchlists yet. Create one to start tracking.</div>
        )}

        {allWatchlists.map((wl) => {
          const isActive = currentWatchlist?.id === wl.id
          const symbolCount = wl.symbol?.length || 0
          const isExpanded = expandedWatchlistId === wl.id
          const isRenaming = renamingWatchlistId === wl.id

          return (
            <div key={wl.id} className="bg-[#131722] border border-[#1f2330] rounded-lg overflow-hidden">
              <div className="w-full flex items-center justify-between px-3 py-3 text-white">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => onToggleExpand(wl)}
                >
                  {isRenaming ? (
                    <input
                      className="bg-[#1b2030] border border-[#2a2e39] text-sm text-white px-2 py-1 rounded outline-none focus:border-[#2962ff]"
                      value={renameValue}
                      onChange={(e) => onRenameChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      maxLength={50}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="text-base font-semibold">{wl.watchlist_name}</span>
                      <span className="text-[10px] text-[#787b86]">{symbolCount} Symbols</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[#cfd3dc]">
                  {isExpanded && !isRenaming && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRenameClick(wl) }}
                        className="p-2 rounded-md bg-[#1f2330] border border-[#2a2e39] text-[#c3d4ff] hover:border-[#2962ff] hover:text-white transition-colors"
                        title="Rename"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(wl) }}
                        className="p-2 rounded-md bg-[#1f2330] border border-[#2a2e39] text-[#f8b4b4] hover:border-[#f23645] hover:text-white transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}

                  <div
                    onClick={() => onToggleExpand(wl)}
                    className="w-6 h-6 rounded border border-[#2a2e39] bg-[#0f1320] flex items-center justify-center cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#787b86] pt-2">
                    <span>Stocks</span>
                  </div>

                  <div className="space-y-2">
                    {watchlistLoading ? (
                      <div className="text-center text-xs text-[#787b86] py-6">Loading watchlist...</div>
                    ) : watchlistData.length > 0 ? (
                      watchlistData.map((stock) => (
                        <div
                          key={stock.symbol}
                          className="group flex items-center justify-between bg-[#1b2030] border border-[#1f2330] rounded-lg px-3 py-2 hover:border-[#2962ff] transition-colors cursor-pointer gap-2"
                          onClick={() => onSelectSymbol(stock.symbol)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white leading-tight">{stock.symbol.replace('.NS', '')}</div>
                            <div className="text-[10px] text-[#787b86]">{cleanCompanyName(stock.name) || 'NSE'}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm text-white font-mono">₹{stock.price.toFixed(2)}</div>
                            <div className={`text-xs ${getColor(stock.change)}`}>{stock.changePercent.toFixed(2)}%</div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveSymbol(stock.symbol) }}
                            className="flex-shrink-0 w-7 h-7 rounded-full border border-[#2a2e39] bg-[#0f1320] text-[#787b86] hover:text-[#f23645] hover:border-[#f23645] flex items-center justify-center transition-colors"
                            title="Remove from watchlist"
                          >
                            <CheckCircle2 className="group-hover:hidden" size={14} />
                            <X className="hidden group-hover:block" size={11} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-xs text-[#787b86] py-6">No symbols in this watchlist</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
