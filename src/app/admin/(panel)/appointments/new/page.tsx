import { ManualBookingForm } from "@/components/admin/ManualBookingForm";
import { zonedDateISO } from "@/lib/time";
import { listServices, requireStaff } from "@/server/admin-data";

export const metadata = { title: "Add appointment", robots: { index: false } };

export default async function NewAppointmentPage() {
  const { settings } = await requireStaff();
  const services = (await listServices()).filter((service) => service.is_active);
  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Appointments</p>
      <h1 className="mt-2 font-serif text-4xl">Add appointment</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-ink/70">For a booking that arrived by WhatsApp. The diary still refuses a time that is already taken.</p>
      <ManualBookingForm services={services} today={zonedDateISO(new Date(), settings.timezone)} timezone={settings.timezone} />
    </div>
  );
}
