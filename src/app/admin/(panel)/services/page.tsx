import { ServiceManager } from "@/components/admin/ServiceManager";
import { listServices, requireStaff } from "@/server/admin-data";

export const metadata = { title: "Services", robots: { index: false } };

export default async function ServicesPage() {
  const { settings } = await requireStaff();
  const services = await listServices();
  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Services</p>
      <h1 className="mt-2 font-serif text-4xl">Catalog</h1>
      <p className="mt-3 max-w-lg text-sm text-ink/70">Duration and price are read from here when someone books. Deactivate a service to hide it.</p>
      <ServiceManager services={services} currency={settings.currency_code} />
    </div>
  );
}
