import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { InvalidLink } from "@/components/site/InvalidLink";
import { PublicFrame } from "@/components/site/PublicFrame";
import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import { formatClock, formatLongDate, formatMoney } from "@/lib/format";
import { bookingWhatsAppMessage } from "@/lib/whatsapp";
import { loadAppointment } from "@/server/public-data";

export const dynamic = "force-dynamic";

export default async function ConfirmedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) return <InvalidLink />;
  const appointment = await loadAppointment(token);
  if (!appointment) return <InvalidLink />;
  const firstName = appointment.customer_name.split(" ")[0];

  return (
    <PublicFrame compact>
      <article className="mx-auto max-w-2xl px-5 py-14 md:py-20">
        <Logo variant="compact" />
        <p className="mt-10 text-[0.72rem] uppercase tracking-[0.28em] text-gold">Appointment confirmed</p>
        <h1 className="mt-3 font-serif text-5xl">Thank you, {firstName}.</h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          Your appointment with <strong className="font-medium text-foreground">{appointment.display_name}</strong> is confirmed.
        </p>
        <div className="mt-8 border border-line bg-elevated p-6 sm:p-8">
          <h2 className="font-serif text-3xl">{appointment.service_name}</h2>
          <p className="mt-4 text-lg">{formatLongDate(appointment.starts_at, appointment.timezone)}</p>
          <p className="mt-1 text-lg">
            {formatClock(appointment.starts_at, appointment.timezone)} – {formatClock(appointment.ends_at, appointment.timezone)}
          </p>
          <p className="mt-4 text-sm text-muted">{formatMoney(appointment.price_cents, appointment.currency_code)}</p>
        </div>
        <p className="mt-6 text-sm leading-7 text-muted">
          {appointment.customer_email
            ? "You will receive a reminder before your appointment."
            : "Save this page or add the appointment to your calendar so you have the details."}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a className="inline-flex min-h-12 items-center justify-center bg-gold px-6 text-[0.72rem] uppercase tracking-[0.18em] text-ink" href={`/api/calendar/${token}`}>
            Add to calendar
          </a>
          <Link className="inline-flex min-h-12 items-center justify-center border border-line px-6 text-[0.72rem] uppercase tracking-[0.18em]" href={`/appointment/manage/${token}`}>
            Manage appointment
          </Link>
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
              className="inline-flex min-h-12 items-center justify-center border border-line px-6 text-[0.72rem] uppercase tracking-[0.18em] text-gold hover:border-gold"
            >
              WhatsApp Yvonnie
            </WhatsAppLink>
          ) : null}
        </div>
      </article>
    </PublicFrame>
  );
}
