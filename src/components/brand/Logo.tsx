import { existsSync } from "node:fs";
import path from "node:path";

const variants = {
  header: {
    src: "/brand/impact-beauty-studio-mark.png",
    file: "impact-beauty-studio-mark.png",
    className: "h-11 w-auto sm:h-12",
  },
  compact: {
    src: "/brand/impact-beauty-studio-mark.png",
    file: "impact-beauty-studio-mark.png",
    className: "h-10 w-auto",
  },
  hero: {
    src: "/brand/impact-beauty-studio-logo.png",
    file: "impact-beauty-studio-logo.png",
    className: "h-56 w-auto max-w-full sm:h-72 md:h-80",
  },
};

export function Logo({ variant = "header" }: { variant?: keyof typeof variants }) {
  const selected = variants[variant];
  const file = path.join(process.cwd(), "public", "brand", selected.file);
  if (!existsSync(file)) {
    return (
      <div className={variant === "hero" ? "max-w-md" : "max-w-[11rem]"}>
        <p className={`font-serif tracking-[0.22em] text-foreground ${variant === "hero" ? "text-5xl sm:text-6xl" : "text-xl"}`}>IMPACT</p>
        <p className="mt-1 text-[0.62rem] uppercase tracking-[0.32em] text-muted">Beauty Studio</p>
        <p className={`font-serif text-gold ${variant === "hero" ? "mt-2 text-3xl" : "text-sm"}`}>By Vee</p>
      </div>
    );
  }

  return (
    <span className="inline-flex overflow-hidden rounded-full">
      {/* The mark and lockup keep their own ratios so neither is stretched. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={selected.src}
        alt="Impact Beauty Studio by Vee"
        className={`${selected.className} max-w-full object-contain`}
      />
    </span>
  );
}
