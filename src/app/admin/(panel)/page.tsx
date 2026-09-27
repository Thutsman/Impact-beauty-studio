import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatClock, formatMoney } from "@/lib/format";
import { addDaysISO, zonedDateISO, zonedTimeToUtc } from "@/lib/time";
import { requireStaff } from "@/server/admin-data";
import type { AppointmentRow } from "@/types/domain";

export const metadata = { title: "Dashboard", robots: { index: false } };

const columns =
  "id, customer_id, service_id, starts_at, ends_at, status, price_cents, duration_minutes, service_name, customer_name, customer_phone, customer_email, notes, source, payment_status";

export default async function DashboardPage() {
  const { supabase, settings } = await requireStaff();
  const today = zonedDateISO(new Date(), settings.timezone);
  const start = zonedTimeToUtc(today, "00:00", settings.timezone);
  const end = zonedTimeToUtc(addDaysISO(today, 1), "00:00", settings.timezone);
  const now = new Date().toISOString();

  const { data: todayRows } = await supabase
    .from("appointments")
    .select(columns)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at");
  const { data: next } = await supabase
    .from("appointments")
    .select(columns)
    .gte("starts_at", now)
    .in("status", ["pending", "confirmed"])
    .order("starts_at")
    .limit(1)
    .maybeSingle();

  const todayList = (todayRows ?? []) as AppointmentRow[];
  const upcoming = (next ?? null) as AppointmentRow | null;
  const revenue = todayList
    .filter((item) => item.status !== "cancelled" && item.status !== "no_show")
    .reduce((sum, item) => sum + item.price_cents, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Today</p>
          <h1 className="mt-2 font-serif text-4xl">Diary</h1>
        </div>
        <Link href="/admin/appointments/new" className="inline-flex min-h-12 items-center bg-ink px-5 text-[0.72rem] uppercase tracking-[0.16em] text-paper">
          Add appointment
        </Link>
      </div>
      <dl className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="border border-ink/10 bg-white p-4">
          <dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Appointments</dt>
          <dd className="mt-2 font-serif text-4xl">{todayList.length}</dd>
        </div>
        <div className="border border-ink/10 bg-white p-4">
          <dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Expected revenue</dt>
          <dd className="mt-2 font-serif text-4xl">{formatMoney(revenue, settings.currency_code)}</dd>
        </div>
        <div className="border border-ink/10 bg-white p-4">
          <dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Next appointment</dt>
          <dd className="mt-2 text-lg">
            {upcoming ? `${formatClock(upcoming.starts_at, settings.timezone)} · ${upcoming.customer_name}` : "None scheduled"}
          </dd>
        </div>
      </dl>
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10 bg-white">
        {todayList.length ? todayList.map((item) => (
          <li key={item.id}>
            <Link href={`/admin/appointments/${item.id}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center">
              <span className="text-sm">{formatClock(item.starts_at, settings.timezone)}</span>
              <span>
                <span className="block">{item.customer_name}</span>
                <span className="text-sm text-ink/60">{item.service_name}</span>
              </span>
              <StatusBadge status={item.status} />
            </Link>
          </li>
        )) : <li className="px-4 py-8 text-sm text-ink/60">No appointments today.</li>}
      </ul>
    </div>
  );
}
