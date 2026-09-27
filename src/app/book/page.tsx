import { PublicFrame } from "@/components/site/PublicFrame";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { addDaysISO, zonedDateISO } from "@/lib/time";
import { loadPublicContext } from "@/server/public-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Book an appointment" };

export default async function BookPage() {
  const context = await loadPublicContext();
  if (!context) {
    return (
      <PublicFrame compact>
        <div className="mx-auto max-w-xl px-5 py-20">
          <h1 className="font-serif text-4xl">Booking is unavailable</h1>
          <p className="mt-4 text-sm leading-7 text-muted">The studio diary is not connected yet. Please try again shortly.</p>
        </div>
      </PublicFrame>
    );
  }

  const today = zonedDateISO(new Date(), context.settings.timezone);
  const latest = addDaysISO(today, context.settings.max_advance_days);

  return (
    <PublicFrame compact>
      {context.services.length ? (
        <BookingWizard context={context} today={today} latest={latest} />
      ) : (
        <div className="mx-auto max-w-xl px-5 py-20">
          <h1 className="font-serif text-4xl">No services are open</h1>
          <p className="mt-4 text-sm leading-7 text-muted">Please check back when appointments are being accepted.</p>
        </div>
      )}
    </PublicFrame>
  );
}
