import Image from "next/image";
import { beforeAfterWork, filmWork, stillWork } from "@/lib/work";
import { BeforeAfter } from "@/components/site/BeforeAfter";

export function WorkGallery() {
  return (
    <section id="work" className="bg-elevated">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-gold">The work</p>
        <h2 className="mt-3 max-w-xl font-serif text-4xl text-foreground md:text-5xl">See what Vee does.</h2>
        <p className="mt-4 max-w-lg text-sm leading-7 text-muted">
          Makeup and wig installation from the studio. Before and after stay together so the change is clear.
        </p>
        <hr className="gold-rule mt-6" />

        <div className="mt-10 grid gap-8">
          {beforeAfterWork.map((piece) => (
            <BeforeAfter key={piece.id} piece={piece} />
          ))}

          <div className="grid gap-8 lg:grid-cols-2">
            {stillWork.map((piece) => (
              <figure key={piece.id} className="border border-line bg-background">
                <div className="relative aspect-[3/4]">
                  <Image
                    src={piece.src}
                    alt={piece.alt}
                    fill
                    className="object-cover object-[center_20%]"
                    sizes="(max-width: 1024px) 100vw, 560px"
                  />
                </div>
                <figcaption className="px-4 py-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted">
                  {piece.caption}
                </figcaption>
              </figure>
            ))}

            {filmWork.map((piece) => (
              <figure key={piece.id} className="border border-line bg-background">
                <video
                  className="aspect-[3/4] w-full bg-black object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={piece.caption}
                >
                  <source src={piece.src} type="video/mp4" />
                </video>
                <figcaption className="px-4 py-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted">
                  {piece.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
