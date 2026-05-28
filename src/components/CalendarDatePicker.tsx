'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarDatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
}

export function CalendarDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
}: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    value ? new Date(value) : new Date()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return placeholder;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const isoString = selectedDate.toISOString().split('T')[0];
    onChange(isoString);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, () => null);

  const monthYear = currentMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan transition-colors text-left"
      >
        {formatDisplayDate(value)}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-card border border-border rounded-lg shadow-lg p-4 w-80">
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white/5 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-text-muted" />
            </button>
            <h3 className="font-semibold text-text text-sm">{monthYear}</h3>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-white/5 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-bold text-text-dim py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const date = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day
              );
              const dateStr = date.toISOString().split('T')[0];
              const isSelected = value === dateStr;
              const isToday =
                dateStr ===
                new Date().toISOString().split('T')[0];

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`
                    w-8 h-8 rounded text-xs font-medium transition-all
                    ${
                      isSelected
                        ? 'bg-cyan text-bg font-bold'
                        : isToday
                        ? 'border border-cyan text-cyan'
                        : 'text-text hover:bg-white/5 hover:border border-border'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              onChange(today);
              setCurrentMonth(new Date());
              setIsOpen(false);
            }}
            className="w-full mt-4 text-xs font-semibold text-cyan hover:bg-cyan/10 rounded py-1.5 transition-colors"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
