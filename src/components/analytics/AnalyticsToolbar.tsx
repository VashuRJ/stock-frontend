/**
 * Analytics Toolbar - Professional dropdown for Compare & Pattern tools
 * TradingView-style toolbar with smooth animations
 */

import React, { useState, useRef, useEffect } from 'react';
import { Brain, BarChart3, ChevronDown } from 'lucide-react';

interface AnalyticsToolbarProps {
    onCompareClick: () => void;
    onPatternClick: () => void;
}

export default function AnalyticsToolbar({ onCompareClick, onPatternClick }: AnalyticsToolbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleCompare = () => {
        setIsOpen(false);
        onCompareClick();
    };

    const handlePattern = () => {
        setIsOpen(false);
        onPatternClick();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Main Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
                <BarChart3 size={18} />
                <span>Analytics</span>
                <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Compare Option */}
                    <button
                        onClick={handleCompare}
                        className="w-full flex items-start gap-3 p-4 hover:bg-[#21262d] transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <BarChart3 className="text-white" size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-semibold mb-1">Compare Periods</div>
                            <div className="text-xs text-[#8b949e]">
                                Compare two different time ranges side-by-side
                            </div>
                        </div>
                    </button>

                    {/* Divider */}
                    <div className="h-px bg-[#30363d]"></div>

                    {/* Pattern Option */}
                    <button
                        onClick={handlePattern}
                        className="w-full flex items-start gap-3 p-4 hover:bg-[#21262d] transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Brain className="text-white" size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-semibold mb-1 flex items-center gap-2">
                                AI Pattern Match
                                <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[9px] rounded font-bold">AI</span>
                            </div>
                            <div className="text-xs text-[#8b949e]">
                                Find similar historical patterns using AI
                            </div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
