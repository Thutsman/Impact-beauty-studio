import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatClock, formatLongDate } from "@/lib/format";
import { addDaysISO, zonedDateISO, zonedTimeToUtc } from "@/lib/time";
import { listAppointments, requireStaff } from "@/server/admin-data";

export const metadata = { title: "Appointments", robots: { index: false } };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const query = await searchParams;
  const { settings } = await requireStaff();
  const today = zonedDateISO(new Date(), settings.timezone);
  const start = zonedTimeToUtc(today, "00:00", settings.timezone);
  const end = zonedTimeToUtc(addDaysISO(today, 60), "00:00", settings.timezone);
  const rows = await listAppointments(start.toISOString(), end.toISOString());
  const status = query.status ?? "active";
  const filtered = rows.filter((item) => {
    if (status === "all") return true;
    if (status === "active") return item.status === "pending" || item.status === "confirmed";
    return item.status === status;
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Appointments</p>
          <h1 className="mt-2 font-serif text-4xl">Coming up</h1>
        </div>
        <Link href="/admin/appointments/new" className="inline-flex min-h-12 items-center bg-ink px-5 text-[0.72rem] uppercase tracking-[0.16em] text-paper">Add appointment</Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 text-[0.72rem] uppercase tracking-[0.14em]">
        {["active", "confirmed", "completed", "cancelled", "no_show", "all"].map((item) => (
          <Link key={item} href={`/admin/appointments?status=${item}`} className={`inline-flex min-h-10 items-center px-3 ${status === item ? "bg-ink text-paper" : "border border-ink/15"}`}>{item.replace("_", " ")}</Link>
        ))}
      </div>
      <ul className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
        {filtered.map((item) => (
          <li key={item.id}>
            <Link href={`/admin/appointments/${item.id}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <span>
                <span className="block">{item.customer_name}</span>
                <span className="text-sm text-ink/60">{item.service_name} · {formatLongDate(item.starts_at, settings.timezone)} · {formatClock(item.starts_at, settings.timezone)}</span>
              </span>
              <StatusBadge status={item.status} />
            </Link>
          </li>
        ))}
        {filtered.length === 0 ? <li className="px-4 py-8 text-sm text-ink/60">No appointments in this view.</li> : null}
      </ul>
    </div>
  );
}
