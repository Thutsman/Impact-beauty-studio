import Link from "next/link";

type Variant = "gold" | "ghost" | "quiet";

const styles: Record<Variant, string> = {
  gold: "inline-flex min-h-12 items-center justify-center bg-gold px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-ink transition hover:bg-gold-soft",
  ghost: "inline-flex min-h-12 items-center justify-center border border-line px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-foreground transition hover:border-gold hover:text-gold",
  quiet: "inline-flex min-h-12 items-center justify-center border border-ink/15 px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-ink transition hover:border-gold-deep hover:text-gold-deep",
};

export function Button({
  href,
  children,
  variant = "gold",
  type = "button",
  disabled,
  className = "",
}: {
  href?: string;
  children: React.ReactNode;
  variant?: Variant;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const classes = `${styles[variant]} ${disabled ? "pointer-events-none opacity-50" : ""} ${className}`;
  if (href) return <Link href={href} className={classes}>{children}</Link>;
  return <button type={type} disabled={disabled} className={classes}>{children}</button>;
}
