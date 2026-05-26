/**
 * Get Indian Fiscal Year for a given date.
 * Fiscal Year runs from April 1st to March 31st of the following year.
 * Example: 2026-05-24 -> "2026-27"
 * Example: 2026-02-15 -> "2025-26"
 */
export function getFiscalYear(dateInput: number | Date): string {
  const date = new Date(dateInput);
  const month = date.getMonth(); // 0-indexed (0 is Jan, 3 is Apr)
  const year = date.getFullYear();

  if (month >= 3) {
    // April to December
    const nextYearShort = String(year + 1).slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    // January to March
    const prevYear = year - 1;
    const currentYearShort = String(year).slice(-2);
    return `${prevYear}-${currentYearShort}`;
  }
}

/**
 * Format timestamp or Date into Indian standard display.
 * Example: 24 May 2026
 */
export function formatIndianDate(dateInput: number | Date): string {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format YYYY-MM or Date into Month Year string.
 * Example: "2026-05" -> "May 2026"
 */
export function formatMonthYear(dateInput: number | Date | string): string {
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const [year, month] = dateInput.split('-').map(Number);
    // month is 1-indexed in string, Date needs 0-indexed month
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Get start and end timestamps (epoch ms) for a given monthly period.
 * Month is formatted as "YYYY-MM"
 */
export function getMonthBoundaries(monthStr: string): { start: number; end: number } {
  const [year, month] = monthStr.split('-').map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0).getTime();
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime(); // last day of month
  return { start, end };
}

/**
 * Get current month string as YYYY-MM
 */
export function getCurrentMonthStr(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
