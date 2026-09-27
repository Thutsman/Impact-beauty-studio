import Link from "next/link";
import { notFound } from "next/navigation";
import { AppointmentActions } from "@/components/admin/AppointmentActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatClock, formatDuration, formatLongDate, formatMoney } from "@/lib/format";
import { whatsappHref } from "@/lib/whatsapp";
import { zonedDateISO } from "@/lib/time";
import { getAppointment, requireStaff } from "@/server/admin-data";

export const metadata = { title: "Appointment", robots: { index: false } };

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { settings } = await requireStaff();
  const appointment = await getAppointment(id);
  if (!appointment) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/appointments" className="text-[0.72rem] uppercase tracking-[0.16em] text-gold-deep">Back</Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl">{appointment.customer_name}</h1>
        <StatusBadge status={appointment.status} />
      </div>
      <dl className="mt-6 grid gap-4 border border-ink/10 bg-white p-5 sm:grid-cols-2">
        <div>
          <dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Phone</dt>
          <dd className="mt-1">
            <a href={`tel:${appointment.customer_phone}`}>{appointment.customer_phone}</a>
            <span className="text-ink/40"> · </span>
            <a href={whatsappHref(appointment.customer_phone)} target="_blank" rel="noreferrer">WhatsApp</a>
          </dd>
        </div>
        <div><dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Service</dt><dd className="mt-1">{appointment.service_name}</dd></div>
        <div><dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Date</dt><dd className="mt-1">{formatLongDate(appointment.starts_at, settings.timezone)}</dd></div>
        <div><dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Time</dt><dd className="mt-1">{formatClock(appointment.starts_at, settings.timezone)} – {formatClock(appointment.ends_at, settings.timezone)}</dd></div>
        <div><dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Duration</dt><dd className="mt-1">{formatDuration(appointment.duration_minutes)}</dd></div>
        <div><dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Price</dt><dd className="mt-1">{formatMoney(appointment.price_cents, settings.currency_code)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-[0.72rem] uppercase tracking-[0.14em] text-ink/50">Notes</dt><dd className="mt-1 whitespace-pre-wrap">{appointment.notes || "None"}</dd></div>
      </dl>
      <AppointmentActions appointment={appointment} today={zonedDateISO(new Date(), settings.timezone)} timezone={settings.timezone} />
    </div>
  );
}
