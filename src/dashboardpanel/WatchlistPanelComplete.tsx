import React, { useState, useCallback } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronRight, CheckCircle2, X, Search, Plus } from 'lucide-react'
import { api } from '@/api/client'

export interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  previousClose: number
  name?: string
  sector?: string
  industry?: string
  marketCap?: number
  exchange?: string
}

interface WatchlistItem {
  id: number
  email: string
  watchlist_name: string
  symbol: string[]
}

interface WatchlistPanelCompleteProps {
  selectedSymbol: string
  onSelectSymbol: (symbol: string) => void
  fetchStock: (symbol: string) => Promise<StockData | null>
  fetchStockSuggestions: (query: string, limit?: number) => Promise<string[]>
  cleanCompanyName: (name?: string) => string | undefined
  getColor: (val: number) => string
}

const WatchlistPanelComplete: React.FC<WatchlistPanelCompleteProps> = ({
  selectedSymbol,
  onSelectSymbol,
  fetchStock,
  fetchStockSuggestions,
  cleanCompanyName,
  getColor,
}) => {
  // --- WATCHLIST STATE ---
  const [allWatchlists, setAllWatchlists] = useState<WatchlistItem[]>([])
  const [currentWatchlist, setCurrentWatchlist] = useState<WatchlistItem | null>(null)
  const [expandedWatchlistId, setExpandedWatchlistId] = useState<number | null>(null)
  const [watchlistData, setWatchlistData] = useState<StockData[]>([])
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  // Create Watchlist Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWatchlistName, setNewWatchlistName] = useState('')
  const [newWatchlistSymbols, setNewWatchlistSymbols] = useState<string[]>([])
  const [modalSearchQuery, setModalSearchQuery] = useState('')
  const [modalSearchResults, setModalSearchResults] = useState<string[]>([])
  const [creatingWatchlist, setCreatingWatchlist] = useState(false)

  // Rename Watchlist State
  const [renamingWatchlistId, setRenamingWatchlistId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTargetWatchlist, setDeleteTargetWatchlist] = useState<WatchlistItem | null>(null)

  // Add Symbol to Existing Watchlist
  const [showAddSymbolModal, setShowAddSymbolModal] = useState(false)
  const [addSymbolQuery, setAddSymbolQuery] = useState('')
  const [addSymbolSuggestions, setAddSymbolSuggestions] = useState<string[]>([])
  const [selectedAddSymbol, setSelectedAddSymbol] = useState<string | null>(null)
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)

  // Toast for notifications
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // --- WATCHLIST BACKEND FUNCTIONS ---

  const loadAllWatchlists = async (email: string) => {
    try {
      const res = await api.get(`/watchlist/detail/${email}`)
      const watchlists: WatchlistItem[] = res.data || []
      setAllWatchlists(watchlists)
      if (watchlists.length > 0) {
        const firstWatchlist = watchlists[0]
        setCurrentWatchlist(firstWatchlist)
        setExpandedWatchlistId(firstWatchlist.id)
        
        // Auto-load stocks for first watchlist
        const symbols = firstWatchlist.symbol || []
        if (symbols.length > 0) {
          setWatchlistLoading(true)
          const wResults = await Promise.all(symbols.map((s: string) => fetchStock(s)))
          setWatchlistData(wResults.filter(Boolean) as StockData[])
          setWatchlistLoading(false)
        }
        
        return firstWatchlist
      }
      return null
    } catch (err) {
      console.error('Error loading watchlists:', err)
      return null
    }
  }

  const createNewWatchlist = async () => {
    const userEmail = localStorage.getItem('user_email')
    if (!userEmail) {
      showToast('❌ Please login first', 'error')
      return
    }
    if (!newWatchlistName.trim()) {
      showToast('❌ Please enter watchlist name', 'error')
      return
    }

    setCreatingWatchlist(true)
    try {
      const res = await api.post('/watchlist/', {
        email: userEmail,
        watchlist_name: newWatchlistName.trim(),
        symbols: newWatchlistSymbols,
      })
      const newWatchlist = res.data
      setAllWatchlists((prev) => [...prev, newWatchlist])
      setCurrentWatchlist(newWatchlist)

      const symbols = newWatchlist.symbol || []
      const wResults = await Promise.all(symbols.map((s: string) => fetchStock(s)))
      setWatchlistData(wResults.filter(Boolean) as StockData[])

      showToast(`✅ Watchlist "${newWatchlistName}" created`, 'success')
      setShowCreateModal(false)
      setNewWatchlistName('')
      setNewWatchlistSymbols([])
      setModalSearchQuery('')
      setModalSearchResults([])
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to create watchlist'
      showToast(`❌ ${msg}`, 'error')
    } finally {
      setCreatingWatchlist(false)
    }
  }

  const switchWatchlist = async (watchlist: WatchlistItem) => {
    setCurrentWatchlist(watchlist)
    setExpandedWatchlistId(watchlist.id)
    const symbols = watchlist.symbol || []
    setWatchlistLoading(true)
    const wResults = await Promise.all(symbols.map((s: string) => fetchStock(s)))
    setWatchlistData(wResults.filter(Boolean) as StockData[])
    setWatchlistLoading(false)
  }

  const deleteWatchlist = async (watchlistId: number) => {
    if (!confirm('Delete this watchlist?')) return
    try {
      await api.delete(`/watchlist/${watchlistId}`)
      setAllWatchlists((prev) => prev.filter((w) => w.id !== watchlistId))
      const remaining = allWatchlists.filter((w) => w.id !== watchlistId)
      if (remaining.length > 0) {
        switchWatchlist(remaining[0])
      } else {
        setCurrentWatchlist(null)
        setWatchlistData([])
      }
      showToast('🗑️ Watchlist deleted', 'success')
      setShowDeleteModal(false)
    } catch (err) {
      showToast('❌ Failed to delete watchlist', 'error')
    }
  }

  const renameWatchlist = async (watchlistId: number, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) {
      showToast('❌ Please enter a name', 'error')
      return
    }
    try {
      const res = await api.put(`/watchlist/${watchlistId}`, {
        watchlist_name: trimmed,
      })
      const updated = res.data
      setAllWatchlists((prev) => prev.map((w) => (w.id === watchlistId ? updated : w)))
      if (currentWatchlist?.id === watchlistId) {
        setCurrentWatchlist(updated)
      }
      showToast('✅ Watchlist renamed', 'success')
      setRenamingWatchlistId(null)
      setShowRenameModal(false)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to rename watchlist'
      showToast(`❌ ${msg}`, 'error')
    }
  }

  const handleModalSearch = async (query: string) => {
    setModalSearchQuery(query)
    if (query.length >= 2) {
      const matches = (await fetchStockSuggestions(query, 10)).filter(
        (s: string) => !newWatchlistSymbols.includes(s)
      )
      setModalSearchResults(matches)
    } else {
      setModalSearchResults([])
    }
  }

  const handleAddSymbolSearch = async (query: string) => {
    setAddSymbolQuery(query)
    if (query.length >= 2) {
      const matches = await fetchStockSuggestions(query, 10)
      setAddSymbolSuggestions(matches)
    } else {
      setAddSymbolSuggestions([])
    }
  }

  const addSymbolToNewWatchlist = (symbol: string) => {
    if (!newWatchlistSymbols.includes(symbol)) {
      setNewWatchlistSymbols((prev) => [...prev, symbol])
      setModalSearchQuery('')
      setModalSearchResults([])
    }
  }

  const removeSymbolFromNewWatchlist = (symbol: string) => {
    setNewWatchlistSymbols((prev) => prev.filter((s) => s !== symbol))
  }

  const toggleExpandWatchlist = async (wl: WatchlistItem) => {
    if (expandedWatchlistId === wl.id) {
      setExpandedWatchlistId(null)
      return
    }
    setExpandedWatchlistId(wl.id)
    if (currentWatchlist?.id !== wl.id) {
      await switchWatchlist(wl)
    }
  }

  const addSymbolToBackend = async (watchlistId: number, symbol: string): Promise<boolean> => {
    try {
      await api.post(`/watchlist/${watchlistId}/add-symbol/${symbol}`)
      return true
    } catch (err: any) {
      console.error('Error adding symbol to backend:', err)
      if (err?.response?.data?.detail) {
        showToast(err.response.data.detail, 'error')
      }
      return false
    }
  }

  const removeSymbolFromBackend = async (watchlistId: number, symbol: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/watchlist/${watchlistId}/remove-symbol/${symbol}`)
      if (response.data && response.data.symbol) {
        setCurrentWatchlist(response.data)
      }
      return true
    } catch (err: any) {
      console.error('❌ Error removing symbol from backend:', err)
      if (err?.response?.data?.detail) {
        showToast(err.response.data.detail, 'error')
      } else {
        showToast('❌ Network error. Please check backend server', 'error')
      }
      return false
    }
  }

  // Load watchlists on mount
  React.useEffect(() => {
    const userEmail = localStorage.getItem('user_email')
    if (userEmail) {
      loadAllWatchlists(userEmail)
    }
  }, [])

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl border animate-slide-in-top min-w-[300px] text-center ${
            toast.type === 'success'
              ? 'bg-[#089981]/20 border-[#089981] text-[#089981]'
              : 'bg-[#f23645]/20 border-[#f23645] text-[#f23645]'
          }`}
        >
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Watchlist Panel */}
      <div className="bg-[#0f1118] rounded-xl border border-[#1f2330] flex flex-col shadow-lg h-[320px] min-h-0 overflow-hidden">
        <div className="p-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-[#2a2e39] hover:bg-[#1e222d] text-white font-semibold py-2 rounded-md border border-[#3a3f4f] transition-colors text-sm"
          >
            + New Watchlist
          </button>
        </div>

        <div className="overflow-y-auto px-2 pb-3 flex-1 space-y-2">
          {allWatchlists.length === 0 && (
            <div className="text-center text-xs text-[#787b86] py-6">
              No watchlists yet. Create one to start tracking.
            </div>
          )}

          {allWatchlists.map((wl) => {
            const symbolCount = wl.symbol?.length || 0
            return (
              <div key={wl.id} className="bg-[#131722] border border-[#1f2330] rounded-lg overflow-hidden">
                <div className="w-full flex items-center justify-between px-3 py-3 text-white">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleExpandWatchlist(wl)}
                  >
                    {renamingWatchlistId === wl.id ? (
                      <input
                        className="bg-[#1b2030] border border-[#2a2e39] text-sm text-white px-2 py-1 rounded outline-none focus:border-[#2962ff]"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
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
                    {expandedWatchlistId === wl.id && renamingWatchlistId !== wl.id && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenamingWatchlistId(wl.id)
                            setRenameValue(wl.watchlist_name)
                            setShowRenameModal(true)
                          }}
                          className="p-2 rounded-md bg-[#1f2330] border border-[#2a2e39] text-[#c3d4ff] hover:border-[#2962ff] hover:text-white transition-colors"
                          title="Rename"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTargetWatchlist(wl)
                            setShowDeleteModal(true)
                          }}
                          className="p-2 rounded-md bg-[#1f2330] border border-[#2a2e39] text-[#f8b4b4] hover:border-[#f23645] hover:text-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}

                    <div
                      onClick={() => toggleExpandWatchlist(wl)}
                      className="w-6 h-6 rounded border border-[#2a2e39] bg-[#0f1320] flex items-center justify-center cursor-pointer"
                    >
                      {expandedWatchlistId === wl.id ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </div>
                  </div>
                </div>

                {expandedWatchlistId === wl.id && (
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
                              <div className="text-sm font-semibold text-white leading-tight">
                                {stock.symbol.replace('.NS', '')}
                              </div>
                              <div className="text-[10px] text-[#787b86]">{cleanCompanyName(stock.name) || 'NSE'}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm text-white font-mono">₹{stock.price.toFixed(2)}</div>
                              <div className={`text-xs ${getColor(stock.change)}`}>{stock.changePercent.toFixed(2)}%</div>
                            </div>

                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (currentWatchlist) {
                                  const ok = await removeSymbolFromBackend(currentWatchlist.id, stock.symbol)
                                  if (ok) {
                                    setWatchlistData((prev) => prev.filter((s) => s.symbol !== stock.symbol))
                                    setCurrentWatchlist((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            symbol: (prev.symbol || []).filter((sym) => sym !== stock.symbol),
                                          }
                                        : prev
                                    )
                                    showToast(
                                      `✅ Removed ${stock.symbol.replace('.NS', '')} from watchlist`,
                                      'success'
                                    )
                                  }
                                }
                              }}
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

      {/* CREATE WATCHLIST MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#2a2e39] flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Add a New Watchlist</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#787b86] hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-[#787b86] mb-2 block">New Watchlist Name</label>
                <input
                  type="text"
                  placeholder="Watchlist 1"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="w-full bg-[#1e222d] border border-[#2a2e39] text-white px-4 py-3 rounded-lg outline-none focus:border-[#2962ff]"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="text-sm text-[#787b86] mb-2 block">Select symbols to add</label>
                <div className="relative">
                  <div className="flex items-center bg-[#1e222d] border border-[#2a2e39] rounded-lg px-3 py-2 focus-within:border-[#2962ff]">
                    <Search size={16} className="text-[#787b86] mr-2" />
                    <input
                      type="text"
                      placeholder="Search stocks..."
                      value={modalSearchQuery}
                      onChange={(e) => handleModalSearch(e.target.value)}
                      className="flex-1 bg-transparent text-white text-sm outline-none"
                    />
                  </div>

                  {modalSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e222d] border border-[#2962ff] rounded-lg shadow-2xl max-h-48 overflow-y-auto z-10">
                      {modalSearchResults.map((sym, i) => (
                        <div
                          key={i}
                          onClick={() => addSymbolToNewWatchlist(sym)}
                          className="px-4 py-2 hover:bg-[#2962ff]/20 cursor-pointer text-white text-sm font-medium border-b border-[#2a2e39] last:border-0"
                        >
                          {sym.replace('.NS', '')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {newWatchlistSymbols.length > 0 && (
                <div>
                  <p className="text-sm text-[#787b86] mb-2">Selected symbols:</p>
                  <div className="space-y-1">
                    {newWatchlistSymbols.map((sym) => (
                      <div
                        key={sym}
                        className="flex items-center justify-between bg-[#1e222d] border border-[#2a2e39] rounded px-3 py-2"
                      >
                        <span className="text-white text-sm">{sym.replace('.NS', '')}</span>
                        <button
                          onClick={() => removeSymbolFromNewWatchlist(sym)}
                          className="text-[#f23645] hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#2a2e39] flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-[#2a2e39] text-white py-2 rounded-lg font-semibold hover:bg-[#3a3f4f] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewWatchlist}
                disabled={creatingWatchlist || !newWatchlistName.trim()}
                className="flex-1 bg-[#2962ff] text-white py-2 rounded-lg font-semibold hover:bg-[#1e53e5] transition-colors disabled:opacity-50"
              >
                {creatingWatchlist ? 'Creating...' : 'Create Watchlist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {showRenameModal && renamingWatchlistId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-sm shadow-2xl">
            <div className="p-5 border-b border-[#2a2e39]">
              <h2 className="text-lg font-bold text-white">Rename Watchlist</h2>
            </div>
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-[#1e222d] border border-[#2a2e39] text-white px-4 py-3 rounded-lg outline-none focus:border-[#2962ff]"
                maxLength={50}
                autoFocus
              />
            </div>
            <div className="p-5 border-t border-[#2a2e39] flex gap-3">
              <button
                onClick={() => {
                  setShowRenameModal(false)
                  setRenamingWatchlistId(null)
                }}
                className="flex-1 bg-[#2a2e39] text-white py-2 rounded-lg font-semibold hover:bg-[#3a3f4f]"
              >
                Cancel
              </button>
              <button
                onClick={() => renameWatchlist(renamingWatchlistId, renameValue)}
                className="flex-1 bg-[#2962ff] text-white py-2 rounded-lg font-semibold hover:bg-[#1e53e5]"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && deleteTargetWatchlist && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131722] rounded-2xl border border-[#2a2e39] w-full max-w-sm shadow-2xl">
            <div className="p-5 border-b border-[#2a2e39]">
              <h2 className="text-lg font-bold text-white">Delete Watchlist?</h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-[#787b86]">
                Are you sure you want to delete "<strong>{deleteTargetWatchlist.watchlist_name}</strong>"? This action
                cannot be undone.
              </p>
            </div>
            <div className="p-5 border-t border-[#2a2e39] flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteTargetWatchlist(null)
                }}
                className="flex-1 bg-[#2a2e39] text-white py-2 rounded-lg font-semibold hover:bg-[#3a3f4f]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteWatchlist(deleteTargetWatchlist.id)
                }}
                className="flex-1 bg-[#f23645] text-white py-2 rounded-lg font-semibold hover:bg-[#d92d37]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default WatchlistPanelComplete
