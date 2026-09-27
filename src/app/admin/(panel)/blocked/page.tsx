import { BlockedManager, RemoveBlock } from "@/components/admin/BlockedManager";
import { formatClock, formatLongDate } from "@/lib/format";
import { zonedDateISO } from "@/lib/time";
import { listBlocks, requireStaff } from "@/server/admin-data";

export const metadata = { title: "Blocked time", robots: { index: false } };

export default async function BlockedPage() {
  const { settings } = await requireStaff();
  const blocks = await listBlocks();
  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Blocked time</p>
      <h1 className="mt-2 font-serif text-4xl">Unavailable</h1>
      <BlockedManager today={zonedDateISO(new Date(), settings.timezone)} />
      <ul className="mt-8 divide-y divide-ink/10 border border-ink/10 bg-white">
        {blocks.map((block) => (
          <li key={block.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div>
              <p>{block.label}</p>
              <p className="text-sm text-ink/60">
                {formatLongDate(block.starts_at, settings.timezone)} · {formatClock(block.starts_at, settings.timezone)} – {formatClock(block.ends_at, settings.timezone)}
              </p>
            </div>
            <RemoveBlock id={block.id} />
          </li>
        ))}
        {blocks.length === 0 ? <li className="px-4 py-8 text-sm text-ink/60">No blocked periods.</li> : null}
      </ul>
    </div>
  );
}
