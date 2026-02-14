// src/utils/formatTimestamp.ts
// Smart timestamp formatting for chat messages

/**
 * Returns a human-friendly relative timestamp string.
 *  - "Just now"        → within 1 minute
 *  - "2m ago"          → within 1 hour
 *  - "2:34 PM"         → today
 *  - "Yesterday 2:34 PM" → yesterday
 *  - "Mon 2:34 PM"     → within the last 7 days
 *  - "Jan 5, 2:34 PM"  → same year
 *  - "Jan 5, 2024"     → older
 */
export function formatMessageTime(dateStr: string | undefined): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const isToday = isSameDay(date, now);
  const isYesterday = isSameDay(date, addDays(now, -1));

  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday ${timeStr}`;

  if (diffHour < 7 * 24) {
    const dayName = date.toLocaleDateString([], { weekday: 'short' });
    return `${dayName} ${timeStr}`;
  }

  if (date.getFullYear() === now.getFullYear()) {
    const monthDay = date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    return `${monthDay}, ${timeStr}`;
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns a date separator label for day boundaries in chat.
 *  - "Today"
 *  - "Yesterday"
 *  - "Monday, January 5" (within same year)
 *  - "Monday, January 5, 2024" (different year)
 */
export function formatDaySeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, -1))) return 'Yesterday';

  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  if (date.getFullYear() !== now.getFullYear()) {
    opts.year = 'numeric';
  }
  return date.toLocaleDateString([], opts);
}

/**
 * Check whether two messages should be grouped (same sender, within 2 minutes).
 */
export function shouldGroupMessages(
  prev: { role: string; userId?: string; createdAt?: string },
  curr: { role: string; userId?: string; createdAt?: string },
): boolean {
  // Different roles → no grouping
  if (prev.role !== curr.role) return false;

  // For user messages in collaborative, check userId
  if (prev.role === 'user' && prev.userId && curr.userId) {
    if (prev.userId !== curr.userId) return false;
  }

  // Check time gap (2 minutes max)
  if (prev.createdAt && curr.createdAt) {
    const gap = Math.abs(
      new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime(),
    );
    if (gap > 2 * 60_000) return false;
  }

  return true;
}

/**
 * Check if two dates are on the same calendar day.
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check if two date strings fall on different calendar days.
 */
export function isDifferentDay(
  dateStrA: string | undefined,
  dateStrB: string | undefined,
): boolean {
  if (!dateStrA || !dateStrB) return true;
  return !isSameDay(new Date(dateStrA), new Date(dateStrB));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
