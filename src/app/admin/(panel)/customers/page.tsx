import Link from "next/link";
import { formatLongDate } from "@/lib/format";
import { listCustomers, requireStaff } from "@/server/admin-data";

export const metadata = { title: "Customers", robots: { index: false } };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { settings } = await requireStaff();
  const query = await searchParams;
  const customers = await listCustomers(query.q ?? "");

  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Customers</p>
      <h1 className="mt-2 font-serif text-4xl">People</h1>
      <form className="mt-6 flex max-w-lg gap-2" action="/admin/customers">
        <label className="sr-only" htmlFor="q">Search customers</label>
        <input id="q" name="q" defaultValue={query.q ?? ""} placeholder="Name or phone" className="bg-white" />
        <button className="min-h-12 bg-ink px-4 text-[0.72rem] uppercase tracking-[0.14em] text-paper" type="submit">Search</button>
      </form>
      <ul className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
        {customers.map((customer) => (
          <li key={customer.id}>
            <Link href={`/admin/customers/${customer.id}`} className="grid gap-1 px-4 py-4 sm:grid-cols-[1.2fr_0.6fr_1fr]">
              <span>
                <span className="block">{customer.full_name}</span>
                <span className="text-sm text-ink/60">{customer.phone}</span>
              </span>
              <span className="text-sm">{customer.appointment_count} appointments</span>
              <span className="text-sm text-ink/70">
                {customer.upcoming_appointment_at
                  ? `Next ${formatLongDate(customer.upcoming_appointment_at, settings.timezone)}`
                  : customer.last_appointment_at
                    ? `Last ${formatLongDate(customer.last_appointment_at, settings.timezone)}`
                    : "No visits yet"}
              </span>
            </Link>
          </li>
        ))}
        {customers.length === 0 ? <li className="px-4 py-8 text-sm text-ink/60">No customers yet.</li> : null}
      </ul>
    </div>
  );
}
