export interface ParsedRRule {
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfMonth?: number;
  month?: number; // 1-indexed
  dayOfWeek?: number; // 0-indexed (0 is Sunday, 1 is Monday)
}

/**
 * Parse a simple RRule string into structured fields.
 * Examples:
 * - "FREQ=WEEKLY;BYDAY=MO"
 * - "FREQ=MONTHLY;BYMONTHDAY=5"
 * - "FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15"
 */
export function parseRRule(rrule: string): ParsedRRule {
  const parts = rrule.split(';').reduce((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val) {
      acc[key] = val;
    }
    return acc;
  }, {} as Record<string, string>);

  const freq = (parts.FREQ?.toLowerCase() || 'monthly') as 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  const dayOfMonth = parts.BYMONTHDAY ? parseInt(parts.BYMONTHDAY) : undefined;
  const month = parts.BYMONTH ? parseInt(parts.BYMONTH) : undefined;
  const byDay = parts.BYDAY;

  let dayOfWeek: number | undefined;
  if (byDay) {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    dayOfWeek = days.indexOf(byDay.toUpperCase());
    if (dayOfWeek === -1) dayOfWeek = undefined;
  }

  return {
    frequency: freq,
    dayOfMonth,
    month,
    dayOfWeek,
  };
}

/**
 * Calculate the next execution time (epoch ms) from a given point in time.
 */
export function getNextRunAt(rrule: string, fromTime?: number): number {
  const now = fromTime ? new Date(fromTime) : new Date();
  const { frequency, dayOfMonth = 1, month = 1, dayOfWeek = 1 } = parseRRule(rrule);

  // Default to 9:00 AM of the target day
  let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);

  if (frequency === 'weekly') {
    const currentDay = next.getDay();
    let diff = dayOfWeek - currentDay;
    if (diff <= 0) diff += 7; // schedule for next week
    next.setDate(next.getDate() + diff);
  } else if (frequency === 'monthly') {
    next = new Date(next.getFullYear(), next.getMonth(), dayOfMonth, 9, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setMonth(next.getMonth() + 1);
    }
  } else if (frequency === 'quarterly') {
    next = new Date(next.getFullYear(), next.getMonth(), dayOfMonth, 9, 0, 0, 0);
    while (next.getTime() <= now.getTime()) {
      next.setMonth(next.getMonth() + 3);
    }
  } else if (frequency === 'yearly') {
    next = new Date(next.getFullYear(), month - 1, dayOfMonth, 9, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setFullYear(next.getFullYear() + 1);
    }
  }

  return next.getTime();
}

/**
 * Format RRule into a clean, human-readable label.
 */
export function scheduleLabel(rrule: string): string {
  const { frequency, dayOfMonth = 1, month = 1, dayOfWeek = 1 } = parseRRule(rrule);

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (frequency === 'weekly') {
    return `Every ${dayNames[dayOfWeek]}`;
  }
  if (frequency === 'monthly') {
    return `Monthly on the ${ordinal(dayOfMonth)}`;
  }
  if (frequency === 'quarterly') {
    return `Quarterly on the ${ordinal(dayOfMonth)}`;
  }
  if (frequency === 'yearly') {
    return `Annually on the ${ordinal(dayOfMonth)} of ${monthNames[month - 1]}`;
  }
  return 'Monthly';
}
