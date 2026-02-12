import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AddPortfolioManually from './AddPortfolioManually';
import { AddPortfolioByCSV } from './addPortfolioByCSV';
import { api } from '../../api/client';

interface Portfolio {
    id: number;
    portfolio_name: string;
    total_holdings: number;
    total_invested: number;
    created_at: string;
}

export const PortfolioDetails = () => {

    const navigate = useNavigate();
    const [showAddPortfolioModalManually, setShowAddPortfolioModalManually] = useState(false);
    const [showAddPortfolioModalByCSV, setShowAddPortfolioModalByCSV] = useState(false);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const user_email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;

    useEffect(() => {
        fetchPortfolios();
    }, []);

    const fetchPortfolios = async () => {
        if (!user_email) {
            console.error('User email not found in localStorage.');
            setLoading(false);
            return;
        }
        try {
            console.log(`Fetching portfolios for user: ${user_email}`);
            const response = await api.get(`/portfolio/list/${user_email}`);
            console.log('Fetched Portfolios:', response.data);
            setPortfolios(response.data);
        } catch (error) {
            console.error('Error fetching portfolios:', error);
        } finally {
            setLoading(false);
        }
    };
    const handleDeletePortfolio = async (portfolioId: number, portfolioName: string) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete "${portfolioName}" portfolio? This action cannot be undone.`);
        if (!confirmDelete) return;

        try {
            await api.delete(`/portfolio/delete/${portfolioId}`);
            // Refresh the portfolio list after deletion
            fetchPortfolios();
            toast.success('Portfolio deleted successfully');
        } catch (error) {
            toast.error('Error deleting portfolio',);
        }
    };

    return (
        <div className='min-h-screen bg-[#131722] pt-4 md:p-2'>
            <div className='max-w-6xl mx-auto'>
                <div className='bg-[#3d4963] rounded-2xl shadow-lg pt-6 px-6 mt-4 min-h-[140px] flex flex-col md:flex-row justify-between'>

                    <div className='flex flex-col md:flex-row justify-between w-full  gap-4 border-b border-gray-300 pb-0'>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Additional Portfolio Information</h2>
                            <p className="text-gray-100">Your all asset in one place.</p>
                        </div>
                        <div className='flex flex-col md:flex-col gap-2'>
                            <button
                                onClick={() => setShowAddPortfolioModalByCSV(true)}
                                className='bg-green-600 text-white rounded-lg hover:bg-green-700 px-4 py-2 flex items-center gap-2 transition cursor-pointer'>
                                <span>Add Portfolio by CSV</span>
                            </button>
                            <button
                                onClick={() => setShowAddPortfolioModalManually(true)}
                                className='bg-green-600 text-white rounded-lg hover:bg-green-700 px-4 py-2 flex items-center gap-2 transition cursor-pointer'>
                                <span>Add Portfolio manually</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Display Portfolios */}
                <div className='mt-8'>
                    <div className='flex justify-between'>
                        <h3 className='text-xl font-semibold text-white mb-4'>Your Portfolios</h3>
                        <button
                            className='hover:rounded-full'
                            onClick={fetchPortfolios}
                            aria-label='refresh'
                        >  <RefreshCw />
                        </button>
                    </div>

                    {loading ? (
                        <p className='text-gray-400 text-center'>Loading portfolios...</p>
                    ) : portfolios.length > 0 ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                            {portfolios.map((portfolio) => (
                                <div key={portfolio.id} className='bg-[#2b3648] p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow'>
                                    <div className='flex justify-between items-center'>
                                        <h4 className='text-lg font-bold text-white capitalize'>{portfolio.portfolio_name}</h4>
                                        <button>
                                            <span
                                                className='text-red-400 text-sm underline hover:cursor-pointer'
                                                aria-label='delete'
                                                onClick={() => handleDeletePortfolio(portfolio.id, portfolio.portfolio_name)}><Trash2 />
                                            </span>
                                        </button>
                                    </div>

                                    <div className='mt-3 space-y-2'>
                                        <p className='text-gray-300'>
                                            <span className='text-gray-400'>Total Holdings:</span> {portfolio.total_holdings}
                                        </p>
                                        <p className='text-gray-300'>
                                            <span className='text-gray-400'>Total Invested:</span> ₹{portfolio.total_invested.toLocaleString('en-IN')}
                                        </p>
                                        <p className='text-gray-400 text-sm'>
                                            Created: {new Date(portfolio.created_at).toLocaleDateString('en-IN')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/portfolio/${portfolio.id}`)}
                                        className='mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition'>
                                        View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='text-gray-400 text-center'>No portfolios found. Add a portfolio to get started!</p>
                    )}
                </div>
            </div>

            {showAddPortfolioModalManually && (
                <div className="fixed inset-0 bg-black backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#131722] rounded-lg shadow-lg w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowAddPortfolioModalManually(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold z-10"
                        >
                            ✕
                        </button>
                        <AddPortfolioManually />
                    </div>
                </div>
            )}
            {showAddPortfolioModalByCSV && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#131722] rounded-lg shadow-lg w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowAddPortfolioModalByCSV(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold z-10"
                        >
                            ✕
                        </button>
                        <AddPortfolioByCSV />
                    </div>
                </div>
            )}
        </div>
    )
}
