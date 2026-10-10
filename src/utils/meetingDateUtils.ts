// Utility functions for meeting dates, Indonesian date string parsing, and active meeting detection
import type { MeetingSchedule } from '../types';

const ID_MONTHS: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  jun: '06',
  jul: '07',
  agu: '08',
  sep: '09',
  okt: '10',
  nov: '11',
  des: '12',
};

/**
 * Parses an Indonesian date string (e.g. "Sabtu, 10 Oktober 2026" or "10 Oktober 2026")
 * into ISO date format "YYYY-MM-DD".
 */
export function parseIndonesianDateToIso(dateStr?: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthName = match[2].toLowerCase();
    const month = ID_MONTHS[monthName];
    const year = match[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Returns the current local date in YYYY-MM-DD format.
 */
export function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks if a meeting falls on today's date.
 */
export function isMeetingToday(meeting?: { isoDate?: string; dateStr?: string; meetingNumber?: number }): boolean {
  if (!meeting) return false;
  const todayIso = getLocalTodayIso();

  // 1. Direct isoDate match
  if (meeting.isoDate && meeting.isoDate.trim() === todayIso) {
    return true;
  }

  // 2. Parse from dateStr
  if (meeting.dateStr) {
    const parsed = parseIndonesianDateToIso(meeting.dateStr);
    if (parsed && parsed === todayIso) {
      return true;
    }
  }

  return false;
}

/**
 * Determines which meeting number should be active or defaulted to:
 * 1. The meeting occurring today (if any)
 * 2. The closest upcoming meeting
 * 3. Fallback meeting number (default 1)
 */
export function getTodayOrActiveMeetingNumber(meetings: MeetingSchedule[] = [], fallback = 1): number {
  if (!meetings || meetings.length === 0) return fallback;

  // Check if any meeting is today
  const todayMeeting = meetings.find(m => isMeetingToday(m));
  if (todayMeeting) return todayMeeting.meetingNumber;

  // Otherwise check upcoming meeting
  const todayIso = getLocalTodayIso();
  const upcoming = meetings.find(m => {
    const iso = m.isoDate || parseIndonesianDateToIso(m.dateStr);
    return iso ? iso >= todayIso : false;
  });
  if (upcoming) return upcoming.meetingNumber;

  // If all meetings are in past or no date matched, pick the first or fallback
  return meetings[0]?.meetingNumber || fallback;
}
