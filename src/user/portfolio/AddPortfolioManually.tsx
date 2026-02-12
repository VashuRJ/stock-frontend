import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';

interface StockSuggestion {
  symbol: string;
  name: string;
  sector: string;
}

const AddPortfolio = () => {

  const user_email = localStorage.getItem('user_email') || '';

  const [portfolioName, setPortfolioName] = useState('');
  const [holdings, setHoldings] = useState([
    { symbol: '', stock_name: '', quantity: '', avg_buy_price: '', sector: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ [key: number]: StockSuggestion[] }>({});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState<{ [key: number]: boolean }>({});
  const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const searchStocks = async (query: string, index: number) => {
    if (query.length < 1) {
      setSuggestions(prev => ({ ...prev, [index]: [] }));
      return;
    }

    setSearchLoading(prev => ({ ...prev, [index]: true }));
    try {
      const response = await api.get(`/stocks/search_with_sector?q=${encodeURIComponent(query)}`);
      setSuggestions(prev => ({ ...prev, [index]: response.data || [] }));
    } catch (error) {
      console.error('Error searching stocks:', error);
      setSuggestions(prev => ({ ...prev, [index]: [] }));
    } finally {
      setSearchLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSymbolChange = (index: number, value: string) => {
    handleChangeHolding(index, 'symbol', value);
    setActiveIndex(index);

    // Clear existing timer
    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
    }

    // Set new debounced search
    debounceTimers.current[index] = setTimeout(() => {
      searchStocks(value, index);
    }, 300);
  };

  const handleSelectSuggestion = (index: number, suggestion: StockSuggestion) => {
    const updatedHoldings = holdings.map((holding, i) =>
      i === index
        ? {
          ...holding,
          symbol: suggestion.symbol,
          stock_name: suggestion.name,
          sector: suggestion.sector || '',
        }
        : holding
    );
    setHoldings(updatedHoldings);
    setSuggestions(prev => ({ ...prev, [index]: [] }));
    setActiveIndex(null);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const handleAddHolding = () => {
    setHoldings([...holdings, { symbol: '', stock_name: '', quantity: '', avg_buy_price: '', sector: '' }]);
  };

  const handleRemoveHolding = (index) => {
    const updatedHoldings = holdings.filter((_, i) => i !== index);
    setHoldings(updatedHoldings);
  };

  const handleChangeHolding = (index, field, value) => {
    const updatedHoldings = holdings.map((holding, i) =>
      i === index ? { ...holding, [field]: value } : holding
    );
    setHoldings(updatedHoldings);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        user_email: user_email,
        portfolio_name: portfolioName,
        holdings: holdings.map((holding) => ({
          ...holding,
          quantity: parseInt(holding.quantity),
          avg_buy_price: parseFloat(holding.avg_buy_price),
        })),
      };
      console.log('Sending portfolio data:', payload);

      const response = await api.post('/portfolio', payload);
      console.log('Portfolio created:', response.data);

      alert('Portfolio added successfully!');
      window.location.reload(); // Refresh to show new portfolio
    } catch (error: any) {
      console.error('Error adding portfolio:', error);
      const errorMsg = error.response?.data?.detail || 'An error occurred while adding the portfolio.';
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" flex items-center justify-center bg-[#131722] ">
      <div className="max-w-3xl mx-auto bg-[#131722] p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-200 mb-6 text-center">Add Portfolio</h1>
        <form onSubmit={handleSubmit}>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">Portfolio Name</label>
            <input
              type="text"
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#1e293b] text-gray-300"
              placeholder="Enter portfolio name"
              required
            />
          </div>

          <h2 className="text-lg font-semibold text-gray-200 mb-4">Holdings</h2>
          {holdings.map((holding, index) => (
            <div key={index} className="mb-6 p-4 border border-gray-600 rounded-lg bg-[#1e293b]">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-200 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={holding.symbol}
                    onChange={(e) => handleSymbolChange(index, e.target.value)}
                    onFocus={() => setActiveIndex(index)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-[#1e293b] focus:border-blue-500"
                    placeholder="Search stock..."
                    required
                    autoComplete="off"
                  />
                  {/* Search Loading Indicator */}
                  {searchLoading[index] && (
                    <div className="absolute right-3 top-10">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  {/* Suggestions Dropdown */}
                  {activeIndex === index && suggestions[index]?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-[#1e293b] border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {suggestions[index].map((suggestion, sIndex) => (
                        <div
                          key={sIndex}
                          onClick={() => handleSelectSuggestion(index, suggestion)}
                          className="px-4 py-3 hover:bg-[#2d3a4f] cursor-pointer border-b border-gray-700 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-blue-400">{suggestion.symbol}</span>
                            {suggestion.sector && (
                              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                {suggestion.sector}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400 truncate">{suggestion.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Stock Name <span className="text-xs text-gray-500">(auto-filled)</span></label>
                  <input
                    type="text"
                    value={holding.stock_name}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-[#1e293b] text-gray-400 cursor-not-allowed"
                    placeholder="Will be auto-filled"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={holding.quantity}
                    onChange={(e) => handleChangeHolding(index, 'quantity', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-[#1e293b] focus:border-blue-500"
                    placeholder="e.g., 10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Avg Buy Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={holding.avg_buy_price}
                    onChange={(e) => handleChangeHolding(index, 'avg_buy_price', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-[#1e293b] focus:border-blue-500"
                    placeholder="e.g., 2500.50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Sector <span className="text-xs text-gray-500">(auto-filled)</span></label>
                  <input
                    type="text"
                    value={holding.sector}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-[#1e293b] text-gray-400 cursor-not-allowed"
                    placeholder="Will be auto-filled"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveHolding(index)}
                className="mt-4 text-red-600 hover:underline"
              >
                Remove Holding
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddHolding}
            className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add Another Holding
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Portfolio'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddPortfolio;