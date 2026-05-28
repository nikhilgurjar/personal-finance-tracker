'use client';

import { useState, useMemo } from 'react';

interface FrequencySelectorProps {
  frequency: string;
  onChange: (frequency: string) => void;
}

type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const DAYS_OF_WEEK = [
  { label: 'Sunday', value: 'SU', abbr: 'Sun' },
  { label: 'Monday', value: 'MO', abbr: 'Mon' },
  { label: 'Tuesday', value: 'TU', abbr: 'Tue' },
  { label: 'Wednesday', value: 'WE', abbr: 'Wed' },
  { label: 'Thursday', value: 'TH', abbr: 'Thu' },
  { label: 'Friday', value: 'FR', abbr: 'Fri' },
  { label: 'Saturday', value: 'SA', abbr: 'Sat' },
];

const MONTHS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

export function FrequencySelector({ frequency, onChange }: FrequencySelectorProps) {
  // Parse current frequency
  const parseFrequency = (rrule: string) => {
    const parts = rrule.split(';').reduce((acc, part) => {
      const [key, val] = part.split('=');
      if (key && val) {
        acc[key] = val;
      }
      return acc;
    }, {} as Record<string, string>);

    const freq = (parts.FREQ?.toLowerCase() || 'monthly') as FrequencyType;
    const dayOfMonth = parts.BYMONTHDAY ? parseInt(parts.BYMONTHDAY) : 5;
    const month = parts.BYMONTH ? parseInt(parts.BYMONTH) : 1;
    const byDay = parts.BYDAY || 'MO';

    return { freq, dayOfMonth, month, byDay };
  };

  const current = parseFrequency(frequency);
  const [freqType, setFreqType] = useState<FrequencyType>(current.freq);
  const [dayOfMonth, setDayOfMonth] = useState(current.dayOfMonth);
  const [dayOfWeek, setDayOfWeek] = useState(current.byDay);
  const [month, setMonth] = useState(current.month);

  // Generate RRule when values change
  const updateFrequency = (
    type: FrequencyType,
    dom?: number,
    dow?: string,
    m?: number
  ) => {
    let rrule = `FREQ=${type.toUpperCase()}`;

    if (type === 'weekly') {
      rrule += `;BYDAY=${dow || dayOfWeek}`;
    } else if (type === 'monthly') {
      rrule += `;BYMONTHDAY=${dom || dayOfMonth}`;
    } else if (type === 'quarterly') {
      rrule += `;BYMONTHDAY=${dom || dayOfMonth}`;
    } else if (type === 'yearly') {
      rrule += `;BYMONTH=${m || month};BYMONTHDAY=${dom || dayOfMonth}`;
    }

    onChange(rrule);
  };

  const handleFreqTypeChange = (newType: FrequencyType) => {
    setFreqType(newType);
    updateFrequency(newType, dayOfMonth, dayOfWeek, month);
  };

  const handleDayOfMonthChange = (newDay: number) => {
    setDayOfMonth(newDay);
    updateFrequency(freqType, newDay, dayOfWeek, month);
  };

  const handleDayOfWeekChange = (newDay: string) => {
    setDayOfWeek(newDay);
    updateFrequency(freqType, dayOfMonth, newDay, month);
  };

  const handleMonthChange = (newMonth: number) => {
    setMonth(newMonth);
    updateFrequency(freqType, dayOfMonth, dayOfWeek, newMonth);
  };

  return (
    <div className="space-y-4">
      {/* Frequency Type */}
      <div>
        <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">
          Frequency
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as FrequencyType[]).map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleFreqTypeChange(type)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                  freqType === type
                    ? 'bg-cyan text-bg border border-cyan'
                    : 'bg-card border border-border text-text-muted hover:text-text hover:border-border-med'
                }`}
              >
                {type}
              </button>
            )
          )}
        </div>
      </div>

      {/* Weekly: Day of Week */}
      {freqType === 'weekly' && (
        <div>
          <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">
            Select Day
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleDayOfWeekChange(day.value)}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dayOfWeek === day.value
                    ? 'bg-cyan text-bg border border-cyan'
                    : 'bg-card border border-border text-text-muted hover:text-text hover:border-border-med'
                }`}
              >
                {day.abbr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly/Quarterly: Day of Month */}
      {(freqType === 'monthly' || freqType === 'quarterly') && (
        <div>
          <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">
            Select Day of Month (1-31)
          </label>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayOfMonthChange(day)}
                className={`px-2 py-1.5 rounded text-xs font-semibold transition-all ${
                  dayOfMonth === day
                    ? 'bg-cyan text-bg border border-cyan'
                    : 'bg-card border border-border text-text-muted hover:text-text hover:border-border-med'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Yearly: Month and Day */}
      {freqType === 'yearly' && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">
              Select Month
            </label>
            <select
              value={month}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan transition-colors"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">
              Select Day of Month
            </label>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayOfMonthChange(day)}
                  className={`px-2 py-1.5 rounded text-xs font-semibold transition-all ${
                    dayOfMonth === day
                      ? 'bg-cyan text-bg border border-cyan'
                      : 'bg-card border border-border text-text-muted hover:text-text hover:border-border-med'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
