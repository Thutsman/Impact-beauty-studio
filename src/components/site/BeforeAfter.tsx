import Image from "next/image";
import type { BeforeAfterPiece } from "@/lib/work";

export function BeforeAfter({ piece }: { piece: BeforeAfterPiece }) {
  return (
    <figure className="border border-line bg-elevated">
      <div className="flex items-end justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold">{piece.title}</p>
          <figcaption className="mt-1 text-sm text-muted">Before and after, shown together.</figcaption>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-line">
        <div className="bg-background">
          <p className="px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] text-muted">Before</p>
          <div className="relative aspect-[3/4]">
            <Image
              src={piece.before.src}
              alt={piece.before.alt}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 50vw, 480px"
            />
          </div>
        </div>
        <div className="bg-background">
          <p className="px-3 py-2 text-[0.65rem] uppercase tracking-[0.16em] text-gold">After</p>
          <div className="relative aspect-[3/4]">
            <Image
              src={piece.after.src}
              alt={piece.after.alt}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 50vw, 480px"
            />
          </div>
        </div>
      </div>
    </figure>
  );
}
