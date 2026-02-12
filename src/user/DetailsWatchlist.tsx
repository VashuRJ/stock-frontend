import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown, Plus, Trash2, Search, Eye, EyeOff, ArrowUpRight, ArrowDownRight, FolderPlus, ChevronLeft, Edit2, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';

interface SymbolData {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: string;
}

interface Watchlist {
  id: number;
  watchlist_name: string;
  email: string;
  symbols: string[];
  symbol_data?: SymbolData[];
  created_at?: string;
}

interface WatchlistListResponse {
  id: number;
  watchlist_name: string;
  symbols_count: number;
}

export const DetailsWatchlist = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newWatchlistDesc, setNewWatchlistDesc] = useState('');
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [addingSymbol, setAddingSymbol] = useState(false);

  const userEmail = localStorage.getItem('user_email') || '';

  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);

  // Fetch all watchlists on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchWatchlists();
  }, []);

  const fetchWatchlists = async () => {
    if (!userEmail) return;
    
    setLoading(true);
    try {
      const res = await api.get<Watchlist[]>(`/watchlist/detail/${userEmail}`);
      setWatchlists(res.data);
    } catch (err) {
      toast.error('Failed to fetch watchlists');
      console.error('Error fetching watchlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlistDetail = async (watchlistId: number) => {
    setLoading(true);
    try {
      const res = await api.get<Watchlist>(`/watchlist/${watchlistId}`);
      console.log('Watchlist detail response:', res.data);
      setSelectedWatchlist(res.data);
      // Also update in the list
      setWatchlists(prev => prev.map(w => w.id === watchlistId ? res.data : w));
    } catch (err) {
      toast.error('Failed to fetch watchlist details');
      console.error('Error fetching watchlist detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      toast.error('Please enter a watchlist name');
      return;
    }

    if (!userEmail) {
      toast.error('User email not found');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<Watchlist>('/watchlist/', {
        email: userEmail,
        watchlist_name: newWatchlistName,
        symbols: []
      });

      setWatchlists([...watchlists, res.data]);
      setNewWatchlistName('');
      setNewWatchlistDesc('');
      setShowCreateModal(false);
      toast.success('Watchlist created successfully!');
    } catch (err) {
      toast.error('Failed to create watchlist');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this watchlist?')) return;

    try {
      await api.delete(`/watchlist/${id}`);
      setWatchlists(watchlists.filter(w => w.id !== id));
      toast.success('Watchlist deleted');
    } catch (err) {
      toast.error('Failed to delete watchlist');
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    if (!selectedWatchlist) return;
    
    try {
      const res = await api.delete<Watchlist>(`/watchlist/${selectedWatchlist.id}/remove-symbol/${symbol}`);
      setSelectedWatchlist(res.data);
      setWatchlists(watchlists.map(w => w.id === selectedWatchlist.id ? res.data : w));
      toast.success('Stock removed from watchlist');
    } catch (err) {
      toast.error('Failed to remove stock');
    }
  };

  const handleAddStock = async () => {
    if (!selectedWatchlist || !newSymbol.trim()) {
      toast.error('Please enter a symbol');
      return;
    }

    setAddingSymbol(true);
    try {
      const res = await api.post<Watchlist>(`/watchlist/${selectedWatchlist.id}/add-symbol/${newSymbol.trim().toUpperCase()}`);
      setSelectedWatchlist(res.data);
      setWatchlists(watchlists.map(w => w.id === selectedWatchlist.id ? res.data : w));
      setNewSymbol('');
      setShowAddStockModal(false);
      toast.success('Stock added to watchlist');
    } catch (err) {
      toast.error('Failed to add stock');
    } finally {
      setAddingSymbol(false);
    }
  };

  const filteredWatchlists = watchlists.filter(w =>
    w.watchlist_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSymbols = selectedWatchlist?.symbols.filter(symbol =>
    symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalStocks = watchlists.reduce((sum, w) => sum + (w.symbols?.length || 0), 0);

  // Helper function to get random gradient color for display
  const getWatchlistColor = (id: number) => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-red-500',
      'from-yellow-500 to-amber-500',
      'from-indigo-500 to-violet-500',
    ];
    return colors[id % colors.length];
  };

  // Watchlist Detail View
  if (selectedWatchlist) {
    return (
      <div className="min-h-screen bg-[#131722] p-4 md:p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <button 
                onClick={() => { setSelectedWatchlist(null); setSearchQuery(''); }}
                className="self-start p-2 hover:bg-gray-500 rounded-lg transition"
                title='back'
              >
                <ChevronLeft className="w-6 h-6 text-gray-100" />
              </button>
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getWatchlistColor(selectedWatchlist.id)} flex items-center justify-center`}>
                <Star className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-50">{selectedWatchlist.watchlist_name}</h1>
                <p className="text-gray-300">{selectedWatchlist.email}</p>
                {selectedWatchlist.created_at && (
                  <p className="text-sm text-gray-200 mt-1">Created on: {new Date(selectedWatchlist.created_at).toLocaleDateString('en-GB')}</p>
                )}
              </div>
              <button 
                onClick={() => setShowAddStockModal(true)}
                className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 px-4 py-2 flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                Add Stock
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-100">Total Stocks</p>
                  <p className="text-2xl font-bold text-gray-50">{selectedWatchlist.symbols?.length || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-100">Last Updated</p>
                  <p className="text-lg font-bold text-gray-100">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-100" />
              <input
                type="text"
                placeholder="Search stocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 bg-[#2a2e39]"
              />
            </div>
          </div>

          {/* Stocks Table */}
          <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 overflow-x-auto">
            <h2 className="text-2xl font-bold text-gray-100 mb-6 border-b border-gray-100">Stocks in {selectedWatchlist.watchlist_name}</h2>
            
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <p className="text-gray-100">Loading stocks...</p>
              </div>
            ) : filteredSymbols.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-50 text-lg">No stocks in this watchlist</p>
                <p className="text-gray-100">Click "Add Stock" to start tracking</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-50">Symbol</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSymbols.map((symbol, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-500 transition">
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-100">{symbol}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleRemoveStock(symbol)}
                            className="p-2 hover:bg-red-50 rounded-lg transition"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* Add Stock Modal */}
        {showAddStockModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#3d4963] rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-100">Add Stock</h3>
                <button 
                  onClick={() => setShowAddStockModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title='Cancel'
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">Symbol *</label>
                  <input
                    type="text"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    placeholder="e.g., RELIANCE.NS"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 bg-black"
                  />
                  <p className="text-xs text-gray-400 mt-1">Enter symbol with suffix (e.g., .NS for NSE)</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddStockModal(false)}
                  className="flex-1 px-4 py-3 border border-red-300 text-red-300 rounded-lg hover:bg-red-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStock}
                  disabled={addingSymbol}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingSymbol ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Watchlists List View
  return (
    <div className="min-h-screen bg-[#131722] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Star className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white">My Watchlists</h1>
              <p className="text-gray-100">Organize and track your favorite stocks</p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 px-4 py-2 flex items-center gap-2 transition"
            >
              <FolderPlus className="w-4 h-4" />
              New Watchlist
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-100">Total Watchlists</p>
                <p className="text-2xl font-bold text-gray-100">{watchlists.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-100">Total Stocks</p>
                <p className="text-2xl font-bold text-green-600">{totalStocks}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-100">Last Updated</p>
                <p className="text-lg font-bold text-gray-100">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-100" />
            <input
              type="text"
              placeholder="Search watchlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 bg-[#2a2e39]"
            />
          </div>
        </div>

        {/* Watchlists Grid */}
        <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-6">Your Watchlists</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-100">Loading watchlists...</p>
            </div>
          ) : filteredWatchlists.length === 0 ? (
            <div className="text-center py-12">
              <FolderPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-100 text-lg">No watchlists found</p>
              <p className="text-gray-100">Create your first watchlist to start tracking stocks</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWatchlists.map((watchlist) => (
                <div 
                  key={watchlist.id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition cursor-pointer group"
                  onClick={() => { fetchWatchlistDetail(watchlist.id); setSearchQuery(''); }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getWatchlistColor(watchlist.id)} flex items-center justify-center`}>
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteWatchlist(watchlist.id); }}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition"
                      title="Delete watchlist"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-1">{watchlist.watchlist_name}</h3>
                  <p className="text-sm text-gray-100 mb-4">{watchlist.email}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-100">{watchlist.symbols?.length || 0} stocks</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#3d4963] rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-down">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-100">Create New Watchlist</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title='Cancel'
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-100 mb-2">Watchlist Name *</label>
                <input
                  type="text"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="e.g., Tech Stocks"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 bg-black"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 border border-red-300 text-red-300 rounded-lg hover:bg-red-400 hover:text-white transition"
              >
                <X className="w-4 h-4 inline-block mr-2 text-red-600" />
                Cancel
              </button>
              <button
                onClick={handleCreateWatchlist}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
