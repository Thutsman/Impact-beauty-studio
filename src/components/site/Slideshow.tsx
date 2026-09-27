"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type Slide = {
  src: string;
  alt: string;
  caption: string;
  focus?: string;
};

export function Slideshow({ slides, intervalMs = 5000 }: { slides: Slide[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  const active = slides[index];

  return (
    <>
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {slides.map((slide, i) => (
          <Image
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            className="object-cover transition-opacity duration-1000 ease-in-out"
            style={{
              objectPosition: slide.focus ?? "center 18%",
              opacity: i === index ? 1 : 0,
            }}
            sizes="(max-width: 768px) 100vw, 42vw"
          />
        ))}
        {slides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`Show slide ${i + 1} of ${slides.length}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1.5 w-6 transition-colors ${i === index ? "bg-gold" : "bg-foreground/30"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <p className="px-5 py-4 text-[0.72rem] uppercase tracking-[0.16em] text-muted">{active.caption}</p>
    </>
  );
}
