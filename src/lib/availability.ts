import { addDaysISO, zonedDateISO, zonedTimeToUtc } from "@/lib/time";

export type TimeRange = {
  start: Date;
  end: Date;
};

export type AvailabilityInput = {
  date: string;
  timeZone: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  durationMinutes: number;
  intervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  now: Date;
  appointments: TimeRange[];
  blocked: TimeRange[];
  respectNotice?: boolean;
  respectAdvance?: boolean;
  exclude?: TimeRange | null;
};

function overlaps(start: Date, end: Date, ranges: TimeRange[], exclude?: TimeRange | null): boolean {
  return ranges.some((range) => {
    if (exclude && range.start.getTime() === exclude.start.getTime() && range.end.getTime() === exclude.end.getTime()) {
      return false;
    }
    return start.getTime() < range.end.getTime() && end.getTime() > range.start.getTime();
  });
}

/**
 * Half-open availability. A service may start when the previous appointment
 * ends, and it must finish at or before closing time.
 * Keep this aligned with public.ibs_available_slots.
 */
export function getAvailableSlots(input: AvailabilityInput): Date[] {
  const respectNotice = input.respectNotice !== false;
  const respectAdvance = input.respectAdvance !== false;
  if (input.durationMinutes <= 0 || input.intervalMinutes <= 0) return [];
  if (input.isClosed || !input.openTime || !input.closeTime) return [];

  const today = zonedDateISO(input.now, input.timeZone);
  if (input.date < today) return [];
  if (respectAdvance && input.date > addDaysISO(today, input.maxAdvanceDays)) return [];

  const open = zonedTimeToUtc(input.date, input.openTime.slice(0, 5), input.timeZone);
  const close = zonedTimeToUtc(input.date, input.closeTime.slice(0, 5), input.timeZone);
  const durationMs = input.durationMinutes * 60 * 1000;
  const stepMs = input.intervalMinutes * 60 * 1000;
  const noticeAt = input.now.getTime() + input.minNoticeMinutes * 60 * 1000;
  const slots: Date[] = [];
  let guard = 0;

  for (let cursor = open.getTime(); cursor + durationMs <= close.getTime() && guard < 300; cursor += stepMs) {
    guard += 1;
    const end = cursor + durationMs;
    const allowed = respectNotice ? cursor >= noticeAt : end > input.now.getTime();
    if (!allowed) continue;
    const startDate = new Date(cursor);
    const endDate = new Date(end);
    if (overlaps(startDate, endDate, input.appointments, input.exclude)) continue;
    if (overlaps(startDate, endDate, input.blocked)) continue;
    slots.push(startDate);
  }

  return slots;
}
