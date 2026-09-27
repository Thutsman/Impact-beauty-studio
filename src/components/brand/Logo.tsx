import { existsSync } from "node:fs";
import path from "node:path";

const heights = {
  header: "h-16 sm:h-[4.5rem]",
  hero: "h-56 sm:h-72 md:h-80",
  compact: "h-12",
};

export function Logo({ variant = "header" }: { variant?: keyof typeof heights }) {
  const file = path.join(process.cwd(), "public", "brand", "impact-beauty-studio-logo.png");
  if (!existsSync(file)) {
    return (
      <div className={variant === "hero" ? "max-w-md" : "max-w-[11rem]"}>
        <p className={`font-serif tracking-[0.22em] text-foreground ${variant === "hero" ? "text-5xl sm:text-6xl" : "text-xl"}`}>IMPACT</p>
        <p className="mt-1 text-[0.62rem] uppercase tracking-[0.32em] text-muted">Beauty Studio</p>
        <p className={`font-serif text-gold ${variant === "hero" ? "mt-2 text-3xl" : "text-sm"}`}>By Vee</p>
        {variant === "hero" ? (
          <p className="mt-4 max-w-xs text-xs leading-5 text-muted">
            Place the official logo at public/brand/impact-beauty-studio-logo.png
          </p>
        ) : null}
      </div>
    );
  }

  return (
    // The logo's intrinsic ratio is unknown, so a plain image keeps it undistorted.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/impact-beauty-studio-logo.png"
      alt="Impact Beauty Studio by Vee"
      className={`${heights[variant]} w-auto max-w-full object-contain`}
    />
  );
}
