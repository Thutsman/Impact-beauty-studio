import { ManagePanel } from "@/components/booking/ManagePanel";
import { Logo } from "@/components/brand/Logo";
import { InvalidLink } from "@/components/site/InvalidLink";
import { PublicFrame } from "@/components/site/PublicFrame";
import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import { formatClock, formatLongDate, formatMoney, statusLabel } from "@/lib/format";
import { addDaysISO, zonedDateISO } from "@/lib/time";
import { bookingWhatsAppMessage } from "@/lib/whatsapp";
import { loadAppointment } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) return <InvalidLink />;
  const appointment = await loadAppointment(token);
  if (!appointment) return <InvalidLink />;
  const today = zonedDateISO(new Date(), appointment.timezone);
  const latest = addDaysISO(today, 90);

  return (
    <PublicFrame compact>
      <article className="mx-auto max-w-2xl px-5 py-12 md:py-16">
        <Logo variant="compact" />
        <p className="mt-8 text-[0.72rem] uppercase tracking-[0.28em] text-gold">{statusLabel(appointment.status)}</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">{appointment.service_name}</h1>
        <p className="mt-4 text-muted">{appointment.display_name}</p>
        <dl className="mt-8 grid gap-4 border border-line p-6 text-sm">
          <div>
            <dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">When</dt>
            <dd className="mt-1 text-lg">{formatLongDate(appointment.starts_at, appointment.timezone)}</dd>
            <dd>{formatClock(appointment.starts_at, appointment.timezone)} – {formatClock(appointment.ends_at, appointment.timezone)}</dd>
          </div>
          <div>
            <dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">Guest</dt>
            <dd className="mt-1">{appointment.customer_name}</dd>
          </div>
          <div>
            <dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">Price</dt>
            <dd className="mt-1">{formatMoney(appointment.price_cents, appointment.currency_code)}</dd>
          </div>
          {appointment.notes ? (
            <div>
              <dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap">{appointment.notes}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-4 text-sm text-muted">Keep this link. It is how you manage the appointment without an account.</p>
        {appointment.whatsapp_phone ? (
          <WhatsAppLink
            phone={appointment.whatsapp_phone}
            message={bookingWhatsAppMessage({
              customerName: appointment.customer_name,
              serviceName: appointment.service_name,
              startsAt: appointment.starts_at,
              endsAt: appointment.ends_at,
              timezone: appointment.timezone,
            })}
            className="mt-5 inline-flex min-h-12 items-center border border-line px-6 text-[0.72rem] uppercase tracking-[0.18em] text-gold hover:border-gold"
          >
            WhatsApp Vee
          </WhatsAppLink>
        ) : null}
        <ManagePanel token={token} appointment={appointment} today={today} latest={latest} />
      </article>
    </PublicFrame>
  );
}
