// src/utils/formatTimestamp.ts
// Smart timestamp formatting for chat messages

type TimestampMode = 'hover' | 'daySeparator';

/**
 * Unified timestamp formatter.
 *
 * mode = 'hover'  (MessageBubble hover)
 *   - Today:      "3:25 PM"
 *   - Yesterday:  "Yesterday at 3:25 PM"
 *   - Other:      "Feb 12, 2026 at 3:25 PM"
 *
 * mode = 'daySeparator'  (DateSeparator between messages)
 *   - Today:      "Today"
 *   - Yesterday:  "Yesterday"
 *   - Other:      "February 12, 2026"
 */
export function formatTimestamp(
  dateStr: string | undefined,
  mode: TimestampMode,
): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const isToday = isSameDay(date, now);
  const isYesterday = isSameDay(date, addDays(now, -1));

  if (mode === 'daySeparator') {
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // mode === 'hover'
  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday at ${timeStr}`;

  const datePartStr = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${datePartStr} at ${timeStr}`;
}

/* Convenience aliases so callers stay readable */
export const formatHoverTimestamp = (d: string | undefined) =>
  formatTimestamp(d, 'hover');
export const formatDaySeparator = (d: string) =>
  formatTimestamp(d, 'daySeparator');

/**
 * Check whether two messages should be grouped (same sender, within 5 minutes,
 * no system message in between).
 */
export function shouldGroupMessages(
  prev: { role: string; userId?: string; createdAt?: string },
  curr: { role: string; userId?: string; createdAt?: string },
): boolean {
  // System messages always break grouping
  if (prev.role === 'system' || curr.role === 'system') return false;

  // Different roles → no grouping
  if (prev.role !== curr.role) return false;

  // For user messages in collaborative, check userId
  if (prev.role === 'user' && prev.userId && curr.userId) {
    if (prev.userId !== curr.userId) return false;
  }

  // Check time gap (5 minutes max for grouping)
  if (prev.createdAt && curr.createdAt) {
    const gap = Math.abs(
      new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime(),
    );
    if (gap > 5 * 60_000) return false;
  }

  return true;
}

/**
 * Check if a smart time separator should be shown between two messages.
 * Returns true when the gap exceeds 15 minutes (Facebook-style).
 */
export function shouldShowTimeSeparator(
  dateStrA: string | undefined,
  dateStrB: string | undefined,
): boolean {
  if (!dateStrA || !dateStrB) return false;
  const gap = Math.abs(
    new Date(dateStrB).getTime() - new Date(dateStrA).getTime(),
  );
  return gap > 15 * 60_000;
}

/**
 * Format a smart time separator label (Facebook-style).
 *   Today → "Today 14:32"
 *   Yesterday → "Yesterday 09:12"
 *   Same week → "Friday 18:05"
 *   Older → "Feb 12 at 10:30"
 */
export function formatTimeSeparator(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isSameDay(date, now)) return `Today ${timeStr}`;
  if (isSameDay(date, addDays(now, -1))) return `Yesterday ${timeStr}`;

  // Same week (within last 6 days)
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 6 * 24 * 60 * 60 * 1000 && diffMs > 0) {
    const dayName = date.toLocaleDateString([], { weekday: 'long' });
    return `${dayName} ${timeStr}`;
  }

  const datePartStr = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  return `${datePartStr} at ${timeStr}`;
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
