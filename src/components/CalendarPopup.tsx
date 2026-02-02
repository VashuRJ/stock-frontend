import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calculator } from 'lucide-react';

interface CalendarPopupProps {
    value: string; // DD/MM/YYYY
    onChange: (newValue: string) => void;
    fieldName?: string;
    disablePast?: boolean;
    className?: string;
    isOpen?: boolean;
    onClose?: () => void;
}

// --- Helper Functions ---

export const formatDateForAPI = (ddmmyyyy: string): string => {
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return '';
    const [day, month, year] = ddmmyyyy.split('/');
    return `${year}-${month}-${day}`;
};

export const formatDateForDisplay = (apiDate: string): string => {
    if (!apiDate) return '';
    const date = new Date(apiDate);
    if (isNaN(date.getTime())) return apiDate; // Return as is if invalid
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export const handleInputMask = (e: React.ChangeEvent<HTMLInputElement>, setValue: (val: string) => void) => {
    let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 8) val = val.slice(0, 8);

    if (val.length > 4) {
        val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length > 2) {
        val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setValue(val);
};

const CalendarPopup: React.FC<CalendarPopupProps> = ({
    value,
    onChange,
    fieldName,
    disablePast = false,
    className = '',
    isOpen,
    onClose,
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Initialize state based on prop value
    useEffect(() => {
        if (value && value.length === 10) {
            const [day, month, year] = value.split('/').map(Number);
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
                setSelectedDate(date);
                setCurrentDate(date); // Jump to selected month
            }
        } else {
            setSelectedDate(null);
        }
    }, [value, isOpen]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const generateCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const daysInPrevMonth = getDaysInMonth(year, month - 1);

        const days = [];

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({
                day: daysInPrevMonth - i,
                type: 'prev',
                date: new Date(year, month - 1, daysInPrevMonth - i)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                type: 'current',
                date: new Date(year, month, i)
            });
        }

        // Next month days to fill 42 cells (7x6)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                day: i,
                type: 'next',
                date: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const navigateMonth = (dir: 1 | -1) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
    };

    const handleDayClick = (date: Date) => {
        if (disablePast) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) return;
        }

        const dayStr = String(date.getDate()).padStart(2, '0');
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const yearStr = date.getFullYear();

        onChange(`${dayStr}/${monthStr}/${yearStr}`);
        if (onClose) onClose();
    };

    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    if (!isOpen) return null;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    return (
        <div className={`absolute top-full mt-1 z-50 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl p-2.5 w-[240px] ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="p-1 hover:bg-[#2a2e39] rounded text-[#d1d4dc] hover:text-white transition-colors"
                    aria-label="Previous Month"
                >
                    <ChevronLeft size={16} />
                </button>
                <div className="font-bold text-white text-xs">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
                <button
                    onClick={() => navigateMonth(1)}
                    className="p-1 hover:bg-[#2a2e39] rounded text-[#d1d4dc] hover:text-white transition-colors"
                    aria-label="Next Month"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 mb-1">
                {weekDays.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-[#787b86]">
                        {d}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {generateCalendar().map((item, idx) => {
                    const isSel = isSelected(item.date);
                    const isTod = isToday(item.date);
                    const isDisabled = disablePast && item.date < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                        <button
                            key={idx}
                            onClick={() => !isDisabled && handleDayClick(item.date)}
                            disabled={isDisabled}
                            className={`
                        h-7 w-7 rounded-full flex items-center justify-center text-[11px] transition-colors
                        ${item.type !== 'current' ? 'text-[#434651]' : 'text-[#d1d4dc]'}
                        ${isSel ? 'bg-[#2962ff] text-white font-bold !opacity-100' : ''}
                        ${!isSel && isTod ? 'border border-[#2962ff] text-[#2962ff]' : ''}
                        ${!isSel && !isDisabled ? 'hover:bg-[#2a2e39] hover:text-white' : ''}
                        ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                        >
                            {item.day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarPopup;
