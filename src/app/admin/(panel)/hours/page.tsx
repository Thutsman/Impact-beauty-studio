import { HoursEditor } from "@/components/admin/HoursEditor";
import { listHours } from "@/server/admin-data";

export const metadata = { title: "Business hours", robots: { index: false } };

export default async function HoursPage() {
  const hours = await listHours();
  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Business hours</p>
      <h1 className="mt-2 font-serif text-4xl">When you are open</h1>
      <p className="mt-3 max-w-lg text-sm text-ink/70">Closed days cannot be booked. A service is only offered when the whole appointment finishes before closing.</p>
      <HoursEditor hours={hours} />
    </div>
  );
}
