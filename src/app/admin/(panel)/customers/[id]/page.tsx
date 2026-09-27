import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerNotes } from "@/components/admin/CustomerNotes";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatClock, formatLongDate } from "@/lib/format";
import { getCustomer, requireStaff } from "@/server/admin-data";

export const metadata = { title: "Customer", robots: { index: false } };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { settings } = await requireStaff();
  const { customer, appointments } = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div>
      <Link href="/admin/customers" className="text-[0.72rem] uppercase tracking-[0.16em] text-gold-deep">Customers</Link>
      <h1 className="mt-3 font-serif text-4xl">{customer.full_name}</h1>
      <p className="mt-2 text-sm text-ink/70">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p>
      <CustomerNotes id={customer.id} notes={customer.notes ?? ""} />
      <h2 className="mt-10 font-serif text-2xl">History</h2>
      <ul className="mt-4 divide-y divide-ink/10 border border-ink/10 bg-white">
        {appointments.map((item) => (
          <li key={item.id}>
            <Link href={`/admin/appointments/${item.id}`} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <span>{item.service_name}<span className="block text-sm text-ink/60">{formatLongDate(item.starts_at, settings.timezone)} · {formatClock(item.starts_at, settings.timezone)}</span></span>
              <StatusBadge status={item.status} />
            </Link>
          </li>
        ))}
        {appointments.length === 0 ? <li className="px-4 py-8 text-sm text-ink/60">No appointments yet.</li> : null}
      </ul>
    </div>
  );
}
