export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

/** Convert a civil date and time in a timezone to a UTC Date. */
export function zonedTimeToUtc(dateISO: string, timeHHMM: string, timeZone: string): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = timeHHMM.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const first = offsetMs(guess, timeZone);
  let utc = new Date(guess.getTime() - first);
  const second = offsetMs(utc, timeZone);
  if (second !== first) utc = new Date(guess.getTime() - second);
  return utc;
}

export function zonedDateISO(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function addDaysISO(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function dayOfWeek(dateISO: string): number {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function startOfZonedDay(dateISO: string, timeZone: string): Date {
  return zonedTimeToUtc(dateISO, "00:00", timeZone);
}

export function nextDateISO(dateISO: string, timeZone: string): string {
  const start = startOfZonedDay(dateISO, timeZone);
  const next = zonedDateISO(new Date(start.getTime() + 36 * 60 * 60 * 1000), timeZone);
  return next;
}
