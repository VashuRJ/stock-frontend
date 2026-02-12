import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ArrowLeft, Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'react-toastify';
import LiveStockData, { useLiveStockPrice } from '../../utils/LiveStockData';

// Profit/Loss Display Component
const ProfitLossDisplay: React.FC<{ currentValue: number; investedValue: number; showAmount?: boolean; showPercent?: boolean }> =
    ({ currentValue, investedValue, showAmount = true, showPercent = true }) => {
        const profitLoss = currentValue - investedValue;
        const profitLossPercent = investedValue > 0 ? ((profitLoss / investedValue) * 100) : 0;
        const isProfit = profitLoss >= 0;

        return (
            <span className={`flex items-center gap-1 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {showAmount && (
                    <span>{isProfit ? '+' : ''}₹{profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                )}
                {showPercent && (
                    <span className='text-xs'>({isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%)</span>
                )}
            </span>
        );
    };

// Component to display single stock live price with P&L (per unit)
const LivePriceWithPL: React.FC<{ symbol: string; avgBuyPrice: number }> = ({ symbol, avgBuyPrice }) => {
    const livePrice = useLiveStockPrice(symbol);
    const currentPrice = livePrice ?? avgBuyPrice;
    const priceDiff = currentPrice - avgBuyPrice;
    const priceChangePercent = avgBuyPrice > 0 ? ((priceDiff / avgBuyPrice) * 100) : 0;
    const isProfit = priceDiff >= 0;

    return (
        <div className='flex flex-col items-center'>
            <span className={livePrice === null ? 'text-gray-400' : isProfit ? 'text-green-400' : 'text-red-400'}>
                ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className='text-gray-500 text-xs'>
                (₹{avgBuyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
            {livePrice !== null && (
                <span className={`flex items-center gap-1 text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isProfit ? '+' : ''}₹{priceDiff.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span>({isProfit ? '+' : ''}{priceChangePercent.toFixed(2)}%)</span>
                </span>
            )}
        </div>
    );
};

// Component to display single holding's current value with P&L
const HoldingCurrentValue: React.FC<{ symbol: string; quantity: number; fallbackPrice: number; totalInvested: number }> = ({ symbol, quantity, fallbackPrice, totalInvested }) => {
    const livePrice = useLiveStockPrice(symbol);
    const currentPrice = livePrice ?? fallbackPrice;
    const currentValue = currentPrice * quantity;

    return (
        <div className='flex flex-col items-center'>
            <span className={livePrice === null ? 'text-gray-400' : livePrice > fallbackPrice ? 'text-green-400' : livePrice < fallbackPrice ? 'text-red-400' : 'text-yellow-400'}>
                ₹{currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className='text-gray-500 text-xs'>(₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
            <ProfitLossDisplay currentValue={currentValue} investedValue={totalInvested} />
        </div>
    );
};

// Component to calculate and display portfolio total current value with P&L
const PortfolioCurrentValue: React.FC<{ holdings: Holding[]; totalInvested: number }> = ({ holdings, totalInvested }) => {
    const [totalValue, setTotalValue] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllPrices = async () => {
            try {
                const pricePromises = holdings.map(async (holding) => {
                    try {
                        const response = await api.get(`/stocks/price/${holding.symbol}`);
                        return {
                            symbol: holding.symbol,
                            price: response.data?.price ?? holding.avg_buy_price,
                            quantity: holding.quantity
                        };
                    } catch {
                        return {
                            symbol: holding.symbol,
                            price: holding.avg_buy_price,
                            quantity: holding.quantity
                        };
                    }
                });

                const prices = await Promise.all(pricePromises);
                const total = prices.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                setTotalValue(total);
            } catch (error) {
                console.error('Error fetching prices:', error);
            } finally {
                setLoading(false);
            }
        };

        if (holdings.length > 0) {
            fetchAllPrices();
            const interval = setInterval(fetchAllPrices, 5000); // Refresh every 5 seconds
            return () => clearInterval(interval);
        } else {
            setTotalValue(0);
            setLoading(false);
        }
    }, [holdings]);

    if (loading) {
        return <span className='text-gray-400'>Loading...</span>;
    }

    const currentVal = totalValue ?? 0;

    return (
        <div className='flex flex-col'>
            <span className='text-xl font-bold'>
                ₹{currentVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <ProfitLossDisplay currentValue={currentVal} investedValue={totalInvested} />
        </div>
    );
};

interface Holding {
    id: number;
    portfolio_id: number;
    symbol: string;
    stock_name: string;
    quantity: number;
    avg_buy_price: number;
    total_invested: number;
    sector: string;
    created_at: string;
    updated_at: string | null;
}

interface PortfolioDetail {
    id: number;
    user_email: string;
    portfolio_name: string;
    holdings: Holding[];
    created_at: string;
    updated_at: string | null;
    total_holdings: number;
    total_invested: number;
}

interface StockSuggestion {
    symbol: string;
    name: string;
    sector: string;
}

export const ViewPortfolioDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState<PortfolioDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
    const [updateForm, setUpdateForm] = useState({ quantity: '', avg_buy_price: '' });
    const [updateLoading, setUpdateLoading] = useState(false);

    // Add new holding states
    const [newHolding, setNewHolding] = useState({ symbol: '', stock_name: '', quantity: '', avg_buy_price: '', sector: '' });
    const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Stock search function
    const searchStocks = async (query: string) => {
        if (query.length < 1) {
            setSuggestions([]);
            return;
        }
        setSearchLoading(true);
        try {
            const response = await api.get(`/stocks/search_with_sector?q=${encodeURIComponent(query)}`);
            setSuggestions(response.data || []);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Error searching stocks:', error);
            setSuggestions([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSymbolChange = (value: string) => {
        setNewHolding(prev => ({ ...prev, symbol: value }));
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => searchStocks(value), 300);
    };

    const handleSelectSuggestion = (suggestion: StockSuggestion) => {
        setNewHolding(prev => ({
            ...prev,
            symbol: suggestion.symbol,
            stock_name: suggestion.name,
            sector: suggestion.sector || ''
        }));
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // Update holding functions
    const openUpdateModal = (holding: Holding) => {
        setEditingHolding(holding);
        setUpdateForm({ quantity: holding.quantity.toString(), avg_buy_price: holding.avg_buy_price.toString() });
        setShowUpdateModal(true);
    };

    const handleUpdateHolding = async () => {
        if (!editingHolding || !portfolio) return;
        setUpdateLoading(true);
        try {
            await api.put(`/portfolio/holding/${editingHolding.id}`, {
                quantity: parseInt(updateForm.quantity),
                avg_buy_price: parseFloat(updateForm.avg_buy_price)
            });
            toast.success('Holding updated successfully!');
            setShowUpdateModal(false);
            fetchPortfolioDetails();
        } catch (err) {
            // console.error('Error updating holding:', err);
            toast.error('Failed to update holding');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleDeleteHolding = async (holdingId: number) => {
        if (!portfolio || !window.confirm('Are you sure you want to delete this holding?')) return;
        try {
            await api.delete(`/portfolio/holding/delete/${holdingId}`);
            toast.success('Holding deleted successfully!');
            fetchPortfolioDetails();
        } catch (err) {
            // console.error('Error deleting holding:', err);
            toast.error('Failed to delete holding');
        }
    };

    // Add new holding function
    const handleAddHolding = async () => {
        if (!portfolio) return;
        if (!newHolding.symbol || !newHolding.stock_name || !newHolding.quantity || !newHolding.avg_buy_price) {
            toast.error('Please fill all required fields');
            return;
        }
        setUpdateLoading(true);
        try {
            await api.post(`/portfolio/${portfolio.id}/holding`, {
                symbol: newHolding.symbol,
                stock_name: newHolding.stock_name,
                quantity: parseInt(newHolding.quantity),
                avg_buy_price: parseFloat(newHolding.avg_buy_price),
                sector: newHolding.sector
            });
            toast.success('Holding added successfully!');
            setShowAddModal(false);
            setNewHolding({ symbol: '', stock_name: '', quantity: '', avg_buy_price: '', sector: '' });
            fetchPortfolioDetails();
        } catch (err) {
            // console.error('Error adding holding:', err);
            toast.error('Failed to add holding');
        } finally {
            setUpdateLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPortfolioDetails();
        }
    }, [id]);

    const fetchPortfolioDetails = async () => {
        try {
            // console.log(`Fetching portfolio details for ID: ${id}`);
            const response = await api.get(`/portfolio/${id}`);
            // console.log('Portfolio Details:', response.data);
            setPortfolio(response.data);
        } catch (err) {
            // console.error('Error fetching portfolio details:', err);
            setError('Failed to load portfolio details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className='min-h-screen bg-[#131722] flex items-center justify-center'>
                <p className='text-gray-400 text-xl'>Loading portfolio details...</p>
            </div>
        );
    }

    if (error || !portfolio) {
        return (
            <div className='min-h-screen bg-[#131722] flex flex-col items-center justify-center'>
                <p className='text-red-400 text-xl mb-4'>{error || 'Portfolio not found'}</p>
                <button
                    onClick={() => navigate(-1)}
                    className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition'>
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-[#131722] pt-4 md:p-8'>
            <div className='max-w-6xl mx-auto'>
                {/* Header */}
                <div className='flex items-center justify-between mb-6 mr-3'>
                    <button
                        onClick={() => navigate(-1)}
                        className='text-gray-300 hover:text-white transition flex items-center gap-1'
                        aria-label='Go back'>
                        <ArrowLeft className='h-6 w-6' />
                        Back
                    </button>
                </div>

                {/* Portfolio Summary Card */}
                <div className='bg-[#3d4963] rounded-2xl shadow-lg p-6 mb-8'>
                    <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
                        <div>
                            <h1 className='text-3xl font-bold text-white capitalize'>{portfolio.portfolio_name}</h1>
                            <p className='text-gray-300 mt-1'>Created on: {new Date(portfolio.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className='flex gap-6'>
                            <div className='text-center'>
                                <p className='text-gray-400 text-sm mb-1'>Current Value</p>
                                <PortfolioCurrentValue holdings={portfolio.holdings} totalInvested={portfolio.total_invested} />
                            </div>
                            <div className='text-center'>
                                <p className='text-gray-400 text-sm mb-1'>Total Invested</p>
                                <p className='text-xl font-bold text-white'>
                                    ₹{portfolio.total_invested.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Holdings Table */}
                <div className='bg-[#2b3648] rounded-2xl shadow-lg overflow-hidden'>
                    <div className='p-6 border-b border-gray-700 flex justify-between items-center'>
                        <h2 className='text-xl font-semibold text-white'>Holdings({portfolio.total_holdings})</h2>
                        <div className='flex gap-3'>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className='bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition flex items-center gap-2'>
                                <Plus />
                                Add Holding
                            </button>
                        </div>
                    </div>

                    {portfolio.holdings.length > 0 ? (
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead className='bg-[#1e2738]'>
                                    <tr className='gap-x-3 '>
                                        <th className='pl-6 py-4 text-left text-sm font-medium text-gray-400 '>
                                            <div>Stock</div>
                                            <div className='text-mono text-gray-500'>(Symbol)</div>
                                        </th>
                                        <th className='py-4 text-left text-sm font-medium text-gray-400'>Sector</th>
                                        <th className='py-4 text-left text-sm font-medium text-gray-400'>Qty</th>
                                        <th className='py-4 text-center text-sm font-medium text-gray-400'>Current (Invested)</th>
                                        <th className='py-4 text-center text-sm font-medium text-gray-400'>Total Current / Invested / P&L</th>
                                        <th className='py-4 text-center text-sm font-medium text-gray-400'>Actions</th>
                                        <th className='py-4 text-left text-sm font-medium text-gray-400'>Prediction</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-700'>
                                    {portfolio.holdings.map((holding) => (
                                        <tr key={holding.id} className='hover:bg-[#343f54] transition'>
                                            <td className='pl-6 py-4'>
                                                <div><p className='text-white font-medium'>{holding.stock_name}</p></div>
                                                <div><span className='text-mono text-blue-400 font-mono'>{holding.symbol}</span></div>
                                            </td>
                                            <td className='py-4 text-left'>
                                                <span className='bg-[#1e2738] text-gray-300 px-3 py-1 rounded-full text-sm'>
                                                    {holding.sector.length > 10
                                                        ? holding.sector.slice(0, 14) + "..."
                                                        : holding.sector}
                                                </span>
                                            </td>
                                            <td className='py-4 text-left text-white'>{holding.quantity}</td>

                                            <td className='py-4 text-center text-white'>
                                                <LivePriceWithPL symbol={holding.symbol} avgBuyPrice={holding.avg_buy_price} />
                                            </td>
                                            <td className='px-6 py-4 text-center text-gray-400 font-medium'>
                                                <HoldingCurrentValue
                                                    symbol={holding.symbol}
                                                    quantity={holding.quantity}
                                                    fallbackPrice={holding.avg_buy_price}
                                                    totalInvested={holding.total_invested}
                                                />
                                            </td>
                                            <td className='px-6 py-4 text-left'>
                                                <div className='flex justify-start gap-2'>
                                                    <button
                                                        onClick={() => openUpdateModal(holding)}
                                                        className='bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition text-sm'>
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteHolding(holding.id)}
                                                        className='bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition text-sm'>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => toast.info('Prediction feature coming soon!')}
                                                    className='bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition text-sm'>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className='p-8 text-center'>
                            <p className='text-gray-400'>No holdings in this portfolio yet.</p>
                        </div>
                    )}
                </div>

                {/* Holdings Cards for Mobile */}
                <div className='md:hidden mt-6 space-y-4'>
                    {portfolio.holdings.map((holding) => (
                        <div key={holding.id} className='bg-[#2b3648] p-4 rounded-xl'>
                            <div className='flex justify-between items-start mb-3'>
                                <div>
                                    <h3 className='text-white font-medium'>{holding.stock_name}</h3>
                                    <p className='text-blue-400 font-mono text-sm'>{holding.symbol}</p>
                                </div>
                                <span className='bg-[#1e2738] text-gray-300 px-3 py-1 rounded-full text-xs'>
                                    {holding.sector}
                                </span>
                            </div>
                            <div className='grid grid-cols-2 gap-3 text-sm'>
                                <div>
                                    <p className='text-gray-400'>Quantity</p>
                                    <p className='text-white'>{holding.quantity}</p>
                                </div>
                                <div>
                                    <p className='text-gray-400'>Avg Price</p>
                                    <p className='text-white'>₹{holding.avg_buy_price.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p className='text-gray-400'>Invested</p>
                                    <p className='text-green-400 font-medium'>₹{holding.total_invested.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p className='text-gray-400'>Added On</p>
                                    <p className='text-white'>{new Date(holding.created_at).toLocaleDateString('en-IN')}</p>
                                </div>
                            </div>
                            <div className='flex gap-2 mt-3'>
                                <button
                                    onClick={() => openUpdateModal(holding)}
                                    className='flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition text-sm'>
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteHolding(holding.id)}
                                    className='flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition text-sm'>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Update Holding Modal */}
            {showUpdateModal && editingHolding && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
                    <div className='bg-[#1e293b] rounded-2xl p-6 w-full max-w-md'>
                        <div className='flex justify-between items-center mb-6'>
                            <h3 className='text-xl font-semibold text-white'>Update Holding</h3>
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className='text-gray-400 hover:text-white transition'
                                aria-label='close'>
                                <X />
                            </button>
                        </div>

                        <div className='mb-4'>
                            <p className='text-blue-400 font-semibold'>{editingHolding.symbol}</p>
                            <p className='text-gray-400 text-sm'>{editingHolding.stock_name}</p>
                        </div>

                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>Quantity</label>
                                <input
                                    type='number'
                                    value={updateForm.quantity}
                                    onChange={(e) => setUpdateForm(prev => ({ ...prev, quantity: e.target.value }))}
                                    className='w-full px-4 py-2 bg-[#131722] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    placeholder='Enter quantity'
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>Avg Buy Price</label>
                                <input
                                    type='number'
                                    step='0.01'
                                    value={updateForm.avg_buy_price}
                                    onChange={(e) => setUpdateForm(prev => ({ ...prev, avg_buy_price: e.target.value }))}
                                    className='w-full px-4 py-2 bg-[#131722] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    placeholder='Enter avg buy price'
                                />
                            </div>
                        </div>

                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className='flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition'>
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateHolding}
                                disabled={updateLoading}
                                className='flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50'>
                                {updateLoading ? 'Updating...' : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Holding Modal */}
            {showAddModal && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
                    <div className='bg-[#1e293b] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto'>
                        <div className='flex justify-between items-center mb-6'>
                            <h3 className='text-xl font-semibold text-white'>Add New Holding</h3>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewHolding({ symbol: '', stock_name: '', quantity: '', avg_buy_price: '', sector: '' });
                                    setSuggestions([]);
                                }}
                                className='text-gray-400 hover:text-white'
                                aria-label='close'>
                                <X />
                            </button>
                        </div>

                        <div className='space-y-4'>
                            {/* Symbol Search */}
                            <div className='relative'>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>Search Stock</label>
                                <input
                                    type='text'
                                    value={newHolding.symbol}
                                    onChange={(e) => handleSymbolChange(e.target.value)}
                                    onFocus={() => setShowSuggestions(true)}
                                    className='w-full px-4 py-2 bg-[#131722] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    placeholder='Type to search stock...'
                                    autoComplete='off'
                                />
                                {searchLoading && (
                                    <div className='absolute right-3 top-10'>
                                        <div className='animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full'></div>
                                    </div>
                                )}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className='absolute z-50 w-full mt-1 bg-[#131722] border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto'>
                                        {suggestions.map((suggestion, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                                className='px-4 py-3 hover:bg-[#2d3a4f] cursor-pointer border-b border-gray-700 last:border-b-0'>
                                                <div className='flex justify-between items-center'>
                                                    <span className='font-semibold text-blue-400'>{suggestion.symbol}</span>
                                                    {suggestion.sector && (
                                                        <span className='text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded'>
                                                            {suggestion.sector}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className='text-sm text-gray-400 truncate'>{suggestion.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Stock Name (Auto-filled) */}
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>Stock Name <span className='text-xs text-gray-500'>(auto-filled)</span></label>
                                <input
                                    type='text'
                                    value={newHolding.stock_name}
                                    readOnly
                                    className='w-full px-4 py-2 bg-[#131722] border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed'
                                    placeholder='Will be auto-filled'
                                />
                            </div>

                            {/* Sector (Auto-filled) */}
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>Sector <span className='text-xs text-gray-500'>(auto-filled)</span></label>
                                <input
                                    type='text'
                                    value={newHolding.sector}
                                    readOnly
                                    className='w-full px-4 py-2 bg-[#131722] border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed'
                                    placeholder='Will be auto-filled'
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>Quantity</label>
                                <input
                                    type='number'
                                    value={newHolding.quantity}
                                    onChange={(e) => setNewHolding(prev => ({ ...prev, quantity: e.target.value }))}
                                    className='w-full px-4 py-2 bg-[#131722] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    placeholder='Enter quantity'
                                />
                            </div>

                            {/* Avg Buy Price */}
                            <div>
                                <label className='block text-sm font-medium text-gray-300 mb-2'>Avg Buy Price</label>
                                <input
                                    type='number'
                                    step='0.01'
                                    value={newHolding.avg_buy_price}
                                    onChange={(e) => setNewHolding(prev => ({ ...prev, avg_buy_price: e.target.value }))}
                                    className='w-full px-4 py-2 bg-[#131722] border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    placeholder='Enter avg buy price'
                                />
                            </div>
                        </div>

                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewHolding({ symbol: '', stock_name: '', quantity: '', avg_buy_price: '', sector: '' });
                                    setSuggestions([]);
                                }}
                                className='flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition'>
                                Cancel
                            </button>
                            <button
                                onClick={handleAddHolding}
                                disabled={updateLoading}
                                className='flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50'>
                                {updateLoading ? 'Adding...' : 'Add Holding'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
