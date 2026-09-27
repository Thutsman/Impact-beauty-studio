import { statusLabel } from "@/lib/format";

const tones: Record<string, string> = {
  confirmed: "border-gold-deep/30 bg-gold-soft text-ink",
  pending: "border-ink/15 bg-white text-ink",
  completed: "border-ok/30 bg-white text-ok",
  cancelled: "border-ink/10 bg-paper-deep text-ink/50",
  no_show: "border-danger/30 bg-white text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex min-h-7 items-center border px-2 text-[0.68rem] uppercase tracking-[0.14em] ${tones[status] ?? tones.pending}`}>
      {statusLabel(status)}
    </span>
  );
}
