import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatClock, formatDayLabel } from "@/lib/format";
import { addDaysISO, dayOfWeek, zonedDateISO, zonedTimeToUtc } from "@/lib/time";
import { listAppointments, requireStaff } from "@/server/admin-data";
import type { AppointmentRow } from "@/types/domain";

export const metadata = { title: "Calendar", robots: { index: false } };

function monthGrid(anchor: string) {
  const [year, month] = anchor.split("-").map(Number);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const startOffset = dayOfWeek(first);
  const gridStart = addDaysISO(first, -startOffset);
  return Array.from({ length: 42 }, (_, index) => addDaysISO(gridStart, index));
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  const query = await searchParams;
  const { settings } = await requireStaff();
  const timezone = settings.timezone;
  const today = zonedDateISO(new Date(), timezone);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : today;
  const view = query.view === "week" || query.view === "month" || query.view === "day" ? query.view : "agenda";

  let rangeStart = date;
  let rangeEnd = addDaysISO(date, 1);
  let days = [date];
  if (view === "agenda") {
    days = Array.from({ length: 7 }, (_, index) => addDaysISO(date, index));
    rangeEnd = addDaysISO(date, 7);
  }
  if (view === "week") {
    rangeStart = addDaysISO(date, -dayOfWeek(date));
    days = Array.from({ length: 7 }, (_, index) => addDaysISO(rangeStart, index));
    rangeEnd = addDaysISO(rangeStart, 7);
  }
  if (view === "month") {
    days = monthGrid(date);
    rangeStart = days[0];
    rangeEnd = addDaysISO(days[days.length - 1], 1);
  }

  const appointments = await listAppointments(
    zonedTimeToUtc(rangeStart, "00:00", timezone).toISOString(),
    zonedTimeToUtc(rangeEnd, "00:00", timezone).toISOString(),
  );
  const byDay = new Map<string, AppointmentRow[]>();
  for (const item of appointments) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(item.starts_at));
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }

  const [year, month] = date.split("-").map(Number);
  const prevMonth = month === 1 ? `${year - 1}-12-01` : `${year}-${String(month - 1).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const step = view === "week" || view === "agenda" ? 7 : 1;
  const prev = view === "month" ? prevMonth : addDaysISO(date, -step);
  const next = view === "month" ? nextMonth : addDaysISO(date, step);

  function href(nextDate: string, nextView = view) {
    return `/admin/calendar?view=${nextView}&date=${nextDate}`;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Calendar</p>
          <h1 className="mt-2 font-serif text-4xl">{formatDayLabel(date, timezone)}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["agenda", "day", "week", "month"] as const).map((item) => (
            <Link key={item} href={href(date, item)} className={`inline-flex min-h-11 items-center px-3 text-[0.72rem] uppercase tracking-[0.14em] ${view === item ? "bg-ink text-paper" : "border border-ink/15"}`} aria-current={view === item ? "page" : undefined}>
              {item}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-4 flex gap-3 text-sm">
        <Link href={href(prev)} className="underline-offset-4 hover:underline">Previous</Link>
        <Link href={href(today)} className="underline-offset-4 hover:underline">Today</Link>
        <Link href={href(next)} className="underline-offset-4 hover:underline">Next</Link>
      </div>

      {view === "month" ? (
        <div className="mt-6 grid grid-cols-7 gap-px bg-ink/10">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
            <div key={label} className="bg-paper-deep px-2 py-2 text-[0.65rem] uppercase tracking-[0.12em] text-ink/50">{label}</div>
          ))}
          {days.map((day) => (
            <div key={day} className={`min-h-16 bg-white p-1 sm:min-h-24 sm:p-2 ${day.slice(0, 7) !== date.slice(0, 7) ? "opacity-50" : ""}`}>
              <Link href={href(day, "day")} className="text-xs">{Number(day.slice(8))}</Link>
              <ul className="mt-1 space-y-1">
                {(byDay.get(day) ?? []).slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <Link href={`/admin/appointments/${item.id}`} className="block truncate border-l-2 border-gold pl-1 text-xs">
                      {formatClock(item.starts_at, timezone)} {item.customer_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : view === "week" ? (
        <div className="mt-6 grid gap-3 lg:grid-cols-7">
          {days.map((day) => (
            <section key={day} className="border border-ink/10 bg-white p-3">
              <h2 className="text-sm">{formatDayLabel(day, timezone)}</h2>
              <ul className="mt-3 space-y-2">
                {(byDay.get(day) ?? []).map((item) => (
                  <li key={item.id}>
                    <Link href={`/admin/appointments/${item.id}`} className="block border-l-2 border-gold pl-2 text-sm">
                      <span className="block">{formatClock(item.starts_at, timezone)}</span>
                      <span className="text-ink/70">{item.customer_name}</span>
                    </Link>
                  </li>
                ))}
                {(byDay.get(day) ?? []).length === 0 ? <li className="text-xs text-ink/40">Open</li> : null}
              </ul>
            </section>
          ))}
        </div>
      ) : view === "agenda" ? (
        <div className="mt-6 space-y-6">
          {days.map((day) => {
            const items = byDay.get(day) ?? [];
            return (
              <section key={day}>
                <h2 className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">{formatDayLabel(day, timezone)}</h2>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-ink/40">Open</p>
                ) : (
                  <ul className="mt-2 divide-y divide-ink/10 border border-ink/10 bg-white">
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link href={`/admin/appointments/${item.id}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center">
                          <span>{formatClock(item.starts_at, timezone)}</span>
                          <span>{item.customer_name}<span className="block text-sm text-ink/60">{item.service_name}</span></span>
                          <StatusBadge status={item.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
          {(byDay.get(date) ?? []).map((item) => (
            <li key={item.id}>
              <Link href={`/admin/appointments/${item.id}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center">
                <span>{formatClock(item.starts_at, timezone)}</span>
                <span>{item.customer_name}<span className="block text-sm text-ink/60">{item.service_name}</span></span>
                <StatusBadge status={item.status} />
              </Link>
            </li>
          ))}
          {(byDay.get(date) ?? []).length === 0 ? <li className="px-4 py-8 text-sm text-ink/60">Nothing booked.</li> : null}
        </ul>
      )}
    </div>
  );
}
