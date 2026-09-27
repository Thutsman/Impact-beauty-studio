export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (minutes % 30 === 0) {
    const hours = minutes / 60;
    return `${hours} hours`;
  }
  return `${minutes} minutes`;
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatTime(iso: string, timeZone: string, hour12 = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: hour12 ? "h12" : "h23",
  }).format(new Date(iso));
}

export function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatLongDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDayLabel(dateISO: string, timeZone: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(utcGuess);
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function slotMessage(reason: string | null): string {
  if (reason === "past") return "That date has already passed.";
  if (reason === "closed") return "The studio is closed on this day.";
  if (reason === "beyond") return "That date is further ahead than the studio accepts.";
  return "No available times on this date.";
}

export function statusLabel(status: string): string {
  if (status === "no_show") return "No-show";
  if (status === "pending") return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
