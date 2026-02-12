import React, { useEffect, useState } from 'react'
import { api } from '@/api/client';

// ============================================
// 1. Simple async function - kahi bhi call kar sakte ho
// ============================================
export const fetchStockPrice = async (symbol: string): Promise<number | null> => {
    try {
        const response = await api.get(`/stocks/price/${symbol}`);
        console.log(`[LiveStock] ${symbol} API Response:`, response.data);
        return response.data?.price ?? null;
    } catch (error) {
        console.error(`[LiveStock] Error fetching ${symbol}:`, error);
        return null;
    }
};

// ============================================
// 2. Custom Hook - React components ke liye
// ============================================
export const useLiveStockPrice = (symbol: string, refreshInterval: number = 5000): number | null => {
    const [price, setPrice] = useState<number | null>(null);

    useEffect(() => {
        const fetchPrice = async () => {
            const newPrice = await fetchStockPrice(symbol);
            // Agar new price null hai (market closed, error, etc.) to previous price rakhenge
            if (newPrice !== null) {
                setPrice(newPrice);
            }
            // Else: previous price as-is rahega
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, refreshInterval);
        return () => clearInterval(interval);
    }, [symbol, refreshInterval]);

    return price;
};

// ============================================
// 3. React Component - JSX me directly use karo
// ============================================
interface LiveStockDataProps {
    symbol: string;
    showCurrency?: boolean;
    refreshInterval?: number;
}

const LiveStockData: React.FC<LiveStockDataProps> = ({ symbol, showCurrency = false, refreshInterval = 5000 }) => {
    const price = useLiveStockPrice(symbol, refreshInterval);

    if (price === null) {
        return <span className='text-gray-400 text-sm'>N/A</span>;
    }

    return (
        <span>
            {showCurrency && '₹'}
            {price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
    );
};

export default LiveStockData;