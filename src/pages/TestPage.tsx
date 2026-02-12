import React, { useState, useEffect } from 'react'
import { api } from '@/api/client'
import { useLiveStockPrice } from '@/utils/LiveStockData'
import { TrendingUp, TrendingDown, BarChart3, Target, Calendar, RefreshCw, AlertCircle, Activity, Layers, CandlestickChart, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react'
import { toast } from 'react-toastify'
const user_email = localStorage.getItem('user_email') || ' ';

interface Holding {
  id: number;
  symbol: string;
  stock_name: string;
  quantity: number;
  avg_buy_price: number;
  total_invested: number;
  sector: string;
}

interface Portfolio {
  id: number;
  portfolio_name: string;
  total_holdings: number;
  total_invested: number;
  created_at: string;
}

interface PortfolioWithHoldings extends Portfolio {
  holdings: Holding[];
}

interface PredictionResult {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  changePercent: number;
  confidence: number;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  targetDate: string;
}

// Trend Analysis Types
interface TrendData {
  trend: 'uptrend' | 'downtrend' | 'sideways';
  signal: string;
  strength: number;
  current_price: number;
  sma_20: number;
  sma_50: number;
}

interface SupportResistanceData {
  support_levels: number[];
  resistance_levels: number[];
  current_price: number;
  nearest_support: number;
  nearest_resistance: number;
}

interface CandlestickPattern {
  pattern: string;
  pattern_type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
  pattern_date: string;
  price: number;
}

interface StockAnalysis {
  trend?: TrendData;
  supportResistance?: SupportResistanceData;
  patterns?: CandlestickPattern[];
  loading: boolean;
}

// Single Stock Prediction Card with Trend Analysis
const StockPredictionCard: React.FC<{
  holding: Holding;
  onPredict: (symbol: string) => void;
  onAnalyzeTrend: (symbol: string) => void;
  prediction: PredictionResult | null;
  analysis: StockAnalysis | null;
  loading: boolean;
}> =
  ({ holding, onPredict, onAnalyzeTrend, prediction, analysis, loading }) => {
    const livePrice = useLiveStockPrice(holding.symbol);
    const currentPrice = livePrice ?? holding.avg_buy_price;
    const profitLoss = (currentPrice - holding.avg_buy_price) * holding.quantity;
    const profitLossPercent = ((currentPrice - holding.avg_buy_price) / holding.avg_buy_price) * 100;

    const getTrendIcon = (trend?: string) => {
      switch (trend) {
        case 'uptrend': return <ArrowUpCircle className='text-green-400' size={18} />;
        case 'downtrend': return <ArrowDownCircle className='text-red-400' size={18} />;
        default: return <MinusCircle className='text-yellow-400' size={18} />;
      }
    };

    const getTrendColor = (trend?: string) => {
      switch (trend) {
        case 'uptrend': return 'text-green-400 bg-green-500/20';
        case 'downtrend': return 'text-red-400 bg-red-500/20';
        default: return 'text-yellow-400 bg-yellow-500/20';
      }
    };

    return (
      <div className='bg-[#2b3648] rounded-xl p-4 hover:bg-[#343f54] transition'>
        <div className='flex justify-between items-start mb-3'>
          <div>
            <h3 className='text-white font-semibold'>{holding.stock_name}</h3>
            <p className='text-blue-400 text-sm font-mono'>{holding.symbol}</p>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <span className='bg-[#1e2738] text-gray-300 px-2 py-1 rounded text-xs'>
              {holding.sector}
            </span>
            {analysis?.trend && (
              <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getTrendColor(analysis.trend.trend)}`}>
                {getTrendIcon(analysis.trend.trend)}
                {analysis.trend.trend.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className='grid grid-cols-2 gap-3 mb-4 text-sm'>
          <div>
            <p className='text-gray-400'>Current Price</p>
            <p className='text-white font-medium'>₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className='text-gray-400'>Avg Buy Price</p>
            <p className='text-white'>₹{holding.avg_buy_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className='text-gray-400'>Quantity</p>
            <p className='text-white'>{holding.quantity}</p>
          </div>
          <div>
            <p className='text-gray-400'>P&L</p>
            <p className={profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
              {profitLoss >= 0 ? '+' : ''}₹{profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <span className='text-xs ml-1'>({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)</span>
            </p>
          </div>
        </div>

        {/* Trend Analysis Section */}
        {analysis?.trend && (
          <div className='bg-[#1e2738] rounded-lg p-3 mb-3'>
            <div className='flex justify-between items-center mb-2'>
              <span className='text-gray-400 text-sm flex items-center gap-1'>
                <Activity size={14} /> Trend Analysis
              </span>
              <span className='text-gray-400 text-xs'>Strength: {analysis.trend.strength}%</span>
            </div>
            <div className='grid grid-cols-2 gap-2 text-xs'>
              <div>
                <span className='text-gray-500'>SMA 20:</span>
                <span className='text-white ml-1'>₹{analysis.trend.sma_20?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className='text-gray-500'>SMA 50:</span>
                <span className='text-white ml-1'>₹{analysis.trend.sma_50?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <p className='text-blue-300 text-xs mt-2'>{analysis.trend.signal}</p>
          </div>
        )}

        {/* Support & Resistance Levels */}
        {analysis?.supportResistance && (
          <div className='bg-[#1e2738] rounded-lg p-3 mb-3'>
            <div className='flex items-center gap-1 mb-2'>
              <Layers size={14} className='text-gray-400' />
              <span className='text-gray-400 text-sm'>Support & Resistance</span>
            </div>
            <div className='grid grid-cols-2 gap-2 text-xs'>
              <div>
                <span className='text-green-400'>Support:</span>
                <span className='text-white ml-1'>₹{analysis.supportResistance.nearest_support?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className='text-red-400'>Resistance:</span>
                <span className='text-white ml-1'>₹{analysis.supportResistance.nearest_resistance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Candlestick Patterns */}
        {analysis?.patterns && analysis.patterns.length > 0 && (
          <div className='bg-[#1e2738] rounded-lg p-3 mb-3'>
            <div className='flex items-center gap-1 mb-2'>
              <CandlestickChart size={14} className='text-gray-400' />
              <span className='text-gray-400 text-sm'>Candlestick Patterns</span>
            </div>
            <div className='flex flex-wrap gap-1'>
              {analysis.patterns.slice(0, 3).map((pattern, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded text-xs ${pattern.pattern_type === 'bullish' ? 'bg-green-500/20 text-green-400' :
                    pattern.pattern_type === 'bearish' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}
                  title={pattern.description}
                >
                  {pattern.pattern} ({pattern.confidence}%)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Prediction Section */}
        {prediction ? (
          <div className='bg-[#1e2738] rounded-lg p-3 mb-3'>
            <div className='flex justify-between items-center mb-2'>
              <span className='text-gray-400 text-sm'>Predicted Price (7 days)</span>
              <span className={`px-2 py-1 rounded text-xs font-bold ${prediction.recommendation === 'BUY' ? 'bg-green-500/20 text-green-400' :
                prediction.recommendation === 'SELL' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                {prediction.recommendation}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              {prediction.changePercent >= 0 ?
                <TrendingUp className='text-green-400' size={20} /> :
                <TrendingDown className='text-red-400' size={20} />
              }
              <span className='text-xl font-bold text-white'>
                ₹{prediction.predictedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-sm ${prediction.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ({prediction.changePercent >= 0 ? '+' : ''}{prediction.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className='mt-2 flex justify-between text-xs text-gray-400'>
              <span>Confidence: {prediction.confidence}%</span>
              <span>Target: {prediction.targetDate}</span>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className='flex gap-2'>
          <button
            onClick={() => onAnalyzeTrend(holding.symbol)}
            disabled={analysis?.loading}
            className='flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm'>
            {analysis?.loading ? (
              <RefreshCw className='animate-spin' size={14} />
            ) : (
              <Activity size={14} />
            )}
            {analysis?.loading ? 'Analyzing...' : 'Trend Analysis'}
          </button>
          <button
            onClick={() => onPredict(holding.symbol)}
            disabled={loading}
            className='flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm'>
            {loading ? (
              <RefreshCw className='animate-spin' size={14} />
            ) : (
              <Target size={14} />
            )}
            {loading ? 'Predicting...' : 'Predict'}
          </button>
        </div>
      </div>
    );
  };

export const TestPage = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [predictions, setPredictions] = useState<Map<string, PredictionResult>>(new Map());
  const [stockAnalysis, setStockAnalysis] = useState<Map<string, StockAnalysis>>(new Map());
  const [predictingSymbol, setPredictingSymbol] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      fetchHoldings(selectedPortfolio.id);
    }
  }, [selectedPortfolio]);

  const fetchPortfolios = async () => {
    try {
      const response = await api.get(`/portfolio/list/${user_email}`);
      setPortfolios(response.data || []);
      if (response.data?.length > 0) {
        setSelectedPortfolio(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      toast.error('Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };

  const fetchHoldings = async (portfolio_id: number) => {
    setHoldingsLoading(true);
    try {
      const response = await api.get(`/portfolio/${portfolio_id}`);
      setHoldings(response.data.holdings || []);
    } catch (error) {
      console.error('Error fetching holdings:', error);
      toast.error('Failed to load holdings');
      setHoldings([]);
    } finally {
      setHoldingsLoading(false);
    }
  };

  // Fetch Trend Analysis from API
  const fetchTrendAnalysis = async (symbol: string): Promise<TrendData | null> => {
    try {
      const response = await api.get(`/trend/${symbol}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching trend for ${symbol}:`, error);
      return null;
    }
  };

  // Fetch Support & Resistance Levels from API
  const fetchSupportResistance = async (symbol: string): Promise<SupportResistanceData | null> => {
    try {
      const response = await api.get(`/trend/support-resistance/${symbol}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching support/resistance for ${symbol}:`, error);
      return null;
    }
  };

  // Fetch Candlestick Patterns from API
  const fetchCandlestickPatterns = async (symbol: string): Promise<CandlestickPattern[] | null> => {
    try {
      const response = await api.get(`/trend/candlestick/${symbol}`);
      return response.data.data?.patterns || [];
    } catch (error) {
      console.error(`Error fetching candlestick patterns for ${symbol}:`, error);
      return null;
    }
  };

  // Complete Trend Analysis for a single stock
  const handleAnalyzeTrend = async (symbol: string) => {
    // Set loading state
    setStockAnalysis(prev => new Map(prev).set(symbol, { ...prev.get(symbol), loading: true }));

    try {
      // Fetch all trend data in parallel
      const [trendData, supportResistanceData, patternsData] = await Promise.all([
        fetchTrendAnalysis(symbol),
        fetchSupportResistance(symbol),
        fetchCandlestickPatterns(symbol)
      ]);

      setStockAnalysis(prev => new Map(prev).set(symbol, {
        trend: trendData || undefined,
        supportResistance: supportResistanceData || undefined,
        patterns: patternsData || undefined,
        loading: false
      }));

      toast.success(`Trend analysis complete for ${symbol}`);
    } catch (error) {
      setStockAnalysis(prev => new Map(prev).set(symbol, { ...prev.get(symbol), loading: false }));
      toast.error(`Failed to analyze ${symbol}`);
    }
  };

  // Mock prediction function - Replace with actual API call
  const predictStock = async (symbol: string): Promise<PredictionResult> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock prediction logic (replace with actual ML API)
    const holding = holdings.find(h => h.symbol === symbol);
    const currentPrice = holding?.avg_buy_price || 100;
    const randomChange = (Math.random() - 0.4) * 15; // -6% to +9% bias towards positive
    const predictedPrice = currentPrice * (1 + randomChange / 100);
    const confidence = Math.floor(65 + Math.random() * 25); // 65-90%

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);

    return {
      symbol,
      currentPrice,
      predictedPrice: Math.round(predictedPrice * 100) / 100,
      changePercent: Math.round(randomChange * 100) / 100,
      confidence,
      recommendation: randomChange > 3 ? 'BUY' : randomChange < -3 ? 'SELL' : 'HOLD',
      targetDate: targetDate.toLocaleDateString('en-IN')
    };
  };

  const handlePredict = async (symbol: string) => {
    setPredictingSymbol(symbol);
    try {
      const result = await predictStock(symbol);
      setPredictions(prev => new Map(prev).set(symbol, result));
      toast.success(`Prediction complete for ${symbol}`);
    } catch (error) {
      toast.error(`Failed to predict ${symbol}`);
    } finally {
      setPredictingSymbol(null);
    }
  };

  const handleAnalyzeAll = async () => {
    if (!selectedPortfolio || holdings.length === 0) return;
    setAnalyzingAll(true);

    for (const holding of holdings) {
      try {
        // Analyze trend for each holding
        await handleAnalyzeTrend(holding.symbol);

        // Also predict
        const result = await predictStock(holding.symbol);
        setPredictions(prev => new Map(prev).set(holding.symbol, result));
      } catch (error) {
        console.error(`Failed to analyze ${holding.symbol}`);
      }
    }

    setAnalyzingAll(false);
    toast.success('Portfolio analysis complete!');
  };

  // Calculate portfolio summary
  const getPortfolioSummary = () => {
    if (!selectedPortfolio || predictions.size === 0 || holdings.length === 0) return null;

    let totalCurrentValue = 0;
    let totalPredictedValue = 0;
    let buyCount = 0, holdCount = 0, sellCount = 0;

    holdings.forEach(holding => {
      const prediction = predictions.get(holding.symbol);
      if (prediction) {
        totalCurrentValue += prediction.currentPrice * holding.quantity;
        totalPredictedValue += prediction.predictedPrice * holding.quantity;
        if (prediction.recommendation === 'BUY') buyCount++;
        else if (prediction.recommendation === 'HOLD') holdCount++;
        else sellCount++;
      }
    });

    const expectedChange = totalPredictedValue - totalCurrentValue;
    const expectedChangePercent = (expectedChange / totalCurrentValue) * 100;

    return { totalCurrentValue, totalPredictedValue, expectedChange, expectedChangePercent, buyCount, holdCount, sellCount };
  };

  const summary = getPortfolioSummary();

  if (loading) {
    return (
      <div className='min-h-screen bg-[#131722] flex items-center justify-center'>
        <RefreshCw className='animate-spin text-blue-400' size={40} />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#131722] p-4 md:p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-white flex items-center gap-3'>
            <BarChart3 className='text-purple-400' />
            Portfolio Analyzer & Predictor
          </h1>
          <p className='text-gray-400 mt-2'>AI-powered stock predictions for your portfolio</p>
        </div>

        {/* Portfolio Selector */}
        <div className='bg-[#2b3648] rounded-xl p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between'>
            <div className='flex items-center gap-4'>
              <label className='text-gray-300'>Select Portfolio:</label>
              <select
                value={selectedPortfolio?.id || ''}
                onChange={(e) => {
                  const portfolio = portfolios.find(p => p.id === parseInt(e.target.value));
                  setSelectedPortfolio(portfolio || null);
                  setPredictions(new Map()); // Clear predictions on portfolio change
                  setStockAnalysis(new Map()); // Clear analysis on portfolio change
                  setHoldings([]); // Clear holdings on portfolio change
                }}
                className='bg-[#1e2738] text-white px-4 py-2 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500'>
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.portfolio_name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAnalyzeAll}
              disabled={analyzingAll || holdings.length === 0 || holdingsLoading}
              className='bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition flex items-center gap-2 disabled:opacity-50'>
              {analyzingAll ? <RefreshCw className='animate-spin' size={18} /> : <Target size={18} />}
              {analyzingAll ? 'Analyzing...' : 'Analyze All Stocks'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
            <div className='bg-[#2b3648] rounded-xl p-4'>
              <p className='text-gray-400 text-sm'>Current Value</p>
              <p className='text-2xl font-bold text-white'>
                ₹{summary.totalCurrentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className='bg-[#2b3648] rounded-xl p-4'>
              <p className='text-gray-400 text-sm'>Predicted Value (7 days)</p>
              <p className='text-2xl font-bold text-purple-400'>
                ₹{summary.totalPredictedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className='bg-[#2b3648] rounded-xl p-4'>
              <p className='text-gray-400 text-sm'>Expected Change</p>
              <p className={`text-2xl font-bold ${summary.expectedChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {summary.expectedChange >= 0 ? '+' : ''}₹{summary.expectedChange.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                <span className='text-sm ml-2'>({summary.expectedChangePercent >= 0 ? '+' : ''}{summary.expectedChangePercent.toFixed(2)}%)</span>
              </p>
            </div>
            <div className='bg-[#2b3648] rounded-xl p-4'>
              <p className='text-gray-400 text-sm mb-2'>Recommendations</p>
              <div className='flex gap-3'>
                <span className='bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm'>BUY: {summary.buyCount}</span>
                <span className='bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm'>HOLD: {summary.holdCount}</span>
                <span className='bg-red-500/20 text-red-400 px-2 py-1 rounded text-sm'>SELL: {summary.sellCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        {/* <div className='bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6 flex items-start gap-2'>
          <AlertCircle className='text-yellow-400 flex-shrink-0 mt-0.5' size={18} />
          <p className='text-yellow-200 text-sm'>
            <strong>Disclaimer:</strong> These predictions are for educational purposes only. Always do your own research before making investment decisions.
          </p>
        </div> */}

        {/* Holdings Grid */}
        {holdingsLoading ? (
          <div className='bg-[#2b3648] rounded-xl p-8 text-center'>
            <RefreshCw className='animate-spin text-blue-400 mx-auto mb-2' size={30} />
            <p className='text-gray-400'>Loading holdings...</p>
          </div>
        ) : holdings.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {holdings.map(holding => (
              <StockPredictionCard
                key={holding.id}
                holding={holding}
                onPredict={handlePredict}
                onAnalyzeTrend={handleAnalyzeTrend}
                prediction={predictions.get(holding.symbol) || null}
                analysis={stockAnalysis.get(holding.symbol) || null}
                loading={predictingSymbol === holding.symbol}
              />
            ))}
          </div>
        ) : (
          <div className='bg-[#2b3648] rounded-xl p-8 text-center'>
            <p className='text-gray-400'>No holdings in this portfolio. Add some stocks to analyze!</p>
          </div>
        )}
      </div>
    </div>
  );
}