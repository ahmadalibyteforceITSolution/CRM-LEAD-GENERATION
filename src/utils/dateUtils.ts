import { format, parseISO, isToday, isPast, isFuture, addDays, isTomorrow, formatDistanceToNow } from 'date-fns';

export function formatDate(dateString?: string, formatStr: string = 'dd MMM yyyy'): string {
  if (!dateString) return '-';
  try {
    const parsed = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(parsed, formatStr);
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return '-';
  const d = formatDate(dateStr, 'dd MMM');
  if (!timeStr) return d;
  return `${d}, ${timeStr}`;
}

export function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function isFollowUpOverdue(dateStr?: string, timeStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return true;
    if (dateStr === today && timeStr) {
      const now = new Date();
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      return timeStr < currentHHmm;
    }
    return false;
  } catch {
    return false;
  }
}

export function isFollowUpDueToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

export function isFollowUpUpcoming(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr > today;
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
