import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, TrendingDown, Plus, Trash2, Search, Eye, EyeOff, ArrowUpRight, ArrowDownRight, FolderPlus, ChevronLeft, Edit2, X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';

interface WatchlistStock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  isWatching: boolean;
}

interface Watchlist {
  id: string;
  name: string;
  description: string;
  stocks: WatchlistStock[];
  createdAt: Date;
  color: string;
}

export const DetailsWatchlist = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newWatchlistDesc, setNewWatchlistDesc] = useState('');

  const [watchlists, setWatchlists] = useState<Watchlist[]>([
    {
      id: '1',
      name: 'Tech Stocks',
      description: 'Top technology companies',
      color: 'from-blue-500 to-cyan-500',
      createdAt: new Date('2025-12-01'),
      stocks: [
        { id: '1', symbol: 'TCS', name: 'Tata Consultancy Services', price: 3892.40, change: -23.15, changePercent: -0.59, volume: '3.2M', marketCap: '14.2T', isWatching: true },
        { id: '2', symbol: 'INFY', name: 'Infosys Limited', price: 1534.20, change: 18.90, changePercent: 1.25, volume: '8.7M', marketCap: '6.4T', isWatching: true },
        { id: '3', symbol: 'WIPRO', name: 'Wipro Limited', price: 456.75, change: 8.30, changePercent: 1.85, volume: '5.1M', marketCap: '2.5T', isWatching: true },
      ],
    },
    {
      id: '2',
      name: 'Banking',
      description: 'Major banking stocks',
      color: 'from-green-500 to-emerald-500',
      createdAt: new Date('2025-11-15'),
      stocks: [
        { id: '4', symbol: 'HDFCBANK', name: 'HDFC Bank Limited', price: 1678.55, change: -12.40, changePercent: -0.73, volume: '5.1M', marketCap: '9.3T', isWatching: true },
        { id: '5', symbol: 'ICICIBANK', name: 'ICICI Bank Limited', price: 1245.30, change: 28.75, changePercent: 2.36, volume: '6.8M', marketCap: '8.7T', isWatching: true },
        { id: '6', symbol: 'SBIN', name: 'State Bank of India', price: 756.20, change: 15.40, changePercent: 2.08, volume: '12.3M', marketCap: '6.8T', isWatching: true },
      ],
    },
    {
      id: '3',
      name: 'Blue Chips',
      description: 'Large cap stable stocks',
      color: 'from-purple-500 to-pink-500',
      createdAt: new Date('2025-10-20'),
      stocks: [
        { id: '7', symbol: 'RELIANCE', name: 'Reliance Industries Ltd', price: 2456.75, change: 45.30, changePercent: 1.88, volume: '12.5M', marketCap: '16.6T', isWatching: true },
        { id: '8', symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: 2534.60, change: -18.20, changePercent: -0.71, volume: '2.1M', marketCap: '5.9T', isWatching: true },
      ],
    },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  const handleCreateWatchlist = () => {
    if (!newWatchlistName.trim()) {
      toast.error('Please enter a watchlist name');
      return;
    }

    const colors = [
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-purple-500 to-pink-500',
      'from-orange-500 to-red-500',
      'from-yellow-500 to-amber-500',
      'from-indigo-500 to-violet-500',
    ];

    const newWatchlist: Watchlist = {
      id: Date.now().toString(),
      name: newWatchlistName,
      description: newWatchlistDesc || 'No description',
      color: colors[Math.floor(Math.random() * colors.length)],
      createdAt: new Date(),
      stocks: [],
    };

    setWatchlists([...watchlists, newWatchlist]);
    setNewWatchlistName('');
    setNewWatchlistDesc('');
    setShowCreateModal(false);
    toast.success('Watchlist created successfully!');
  };

  const handleDeleteWatchlist = (id: string) => {
    if (window.confirm('Are you sure you want to delete this watchlist?')) {
      setWatchlists(watchlists.filter(w => w.id !== id));
      toast.success('Watchlist deleted');
    }
  };

  const handleRemoveStock = (stockId: string) => {
    if (!selectedWatchlist) return;
    
    const updatedWatchlist = {
      ...selectedWatchlist,
      stocks: selectedWatchlist.stocks.filter(s => s.id !== stockId)
    };
    
    setWatchlists(watchlists.map(w => w.id === selectedWatchlist.id ? updatedWatchlist : w));
    setSelectedWatchlist(updatedWatchlist);
    toast.success('Stock removed from watchlist');
  };

  const filteredWatchlists = watchlists.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStocks = selectedWatchlist?.stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalStocks = watchlists.reduce((sum, w) => sum + w.stocks.length, 0);

  // Watchlist Detail View
  if (selectedWatchlist) {
    const gainers = selectedWatchlist.stocks.filter(s => s.change > 0).length;
    const losers = selectedWatchlist.stocks.filter(s => s.change < 0).length;

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
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${selectedWatchlist.color} flex items-center justify-center`}>
                <Star className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-50">{selectedWatchlist.name}</h1>
                <p className="text-gray-300">{selectedWatchlist.description}</p>
                <p className="text-sm text-gray-200 mt-1">Created on: {selectedWatchlist.createdAt.toLocaleDateString('en-GB')}</p>
              </div>
              <button className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 px-4 py-2 flex items-center gap-2 transition">
                <Plus className="w-4 h-4" />
                Add Stock
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-100">Total Stocks</p>
                  <p className="text-2xl font-bold text-gray-50">{selectedWatchlist.stocks.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-100">Gainers</p>
                  <p className="text-2xl font-bold text-green-600">{gainers}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#3d4963] rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-100">Losers</p>
                  <p className="text-2xl font-bold text-red-600">{losers}</p>
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
            <h2 className="text-2xl font-bold text-gray-100 mb-6 border-b border-gray-100">Stocks in {selectedWatchlist.name}</h2>
            
            {filteredStocks.length === 0 ? (
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-50">Name</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-50">Price (₹)</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-50">Change</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-50">Volume</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock) => (
                    <tr key={stock.id} className="border-b border-gray-100 hover:bg-gray-500 transition">
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-100">{stock.symbol}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-100">{stock.name}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-gray-100">₹{stock.price.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className={`flex items-center justify-end gap-1 ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span className="font-medium">
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-100">{stock.volume}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleRemoveStock(stock.id)}
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
          
          {filteredWatchlists.length === 0 ? (
            <div className="text-center py-12">
              <FolderPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-100 text-lg">No watchlists found</p>
              <p className="text-gray-100">Create your first watchlist to start tracking stocks</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWatchlists.map((watchlist) => {
                const gainers = watchlist.stocks.filter(s => s.change > 0).length;
                const losers = watchlist.stocks.filter(s => s.change < 0).length;
                
                return (
                  <div 
                    key={watchlist.id}
                    className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition cursor-pointer group"
                    onClick={() => setSelectedWatchlist(watchlist)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${watchlist.color} flex items-center justify-center`}>
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
                    
                    <h3 className="text-xl font-bold text-white mb-1">{watchlist.name}</h3>
                    <p className="text-sm text-gray-100 mb-4">{watchlist.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-100">{watchlist.stocks.length} stocks</span>
                      <div className="flex items-center gap-3">
                        <span className="text-green-600 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" /> {gainers}
                        </span>
                        <span className="text-red-600 flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" /> {losers}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              
              <div>
                <label className="block text-sm font-medium text-gray-100 mb-2">Description</label>
                <textarea
                  value={newWatchlistDesc}
                  onChange={(e) => setNewWatchlistDesc(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 bg-black resize-none"
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
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
