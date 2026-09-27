"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/server/admin-actions";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/calendar", "Calendar"],
  ["/admin/appointments", "Appointments"],
  ["/admin/customers", "Customers"],
  ["/admin/services", "Services"],
  ["/admin/hours", "Business Hours"],
  ["/admin/blocked", "Blocked Time"],
  ["/admin/settings", "Settings"],
];

function Item({ href, label, current }: { href: string; label: string; current: string }) {
  const active = href === "/admin" ? current === "/admin" : current.startsWith(href);
  return (
    <Link
      href={href}
      className={`block px-4 py-3 text-sm ${active ? "bg-surface text-gold" : "text-muted hover:text-foreground"}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function Mark({ logoReady, className }: { logoReady: boolean; className: string }) {
  if (!logoReady) {
    return <span className="font-serif tracking-[0.16em] text-foreground">IMPACT</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/impact-beauty-studio-logo.png" alt="Impact Beauty Studio by Vee" className={className} />
  );
}

export function AdminShell({ children, logoReady }: { children: React.ReactNode; logoReady: boolean }) {
  const current = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-background text-foreground md:flex md:min-h-screen md:flex-col">
        <Link href="/" className="border-b border-line px-4 py-5">
          <Mark logoReady={logoReady} className="h-14 w-auto" />
        </Link>
        <nav aria-label="Studio" className="flex-1 py-4">
          {links.map(([href, label]) => (
            <Item key={href} href={href} label={label} current={current} />
          ))}
        </nav>
        <form action={signOut} className="border-t border-line p-4">
          <button type="submit" className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">Sign out</button>
        </form>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-ink/10 bg-background px-4 py-3 text-foreground md:hidden">
          <button type="button" className="min-h-11 px-2 text-[0.72rem] uppercase tracking-[0.16em]" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            Menu
          </button>
          <Mark logoReady={logoReady} className="h-10 w-auto" />
          <form action={signOut}>
            <button type="submit" className="min-h-11 text-[0.72rem] uppercase tracking-[0.16em] text-muted">Out</button>
          </form>
        </header>
        {open ? (
          <nav aria-label="Studio" className="border-b border-line bg-background text-foreground md:hidden">
            {links.map(([href, label]) => (
              <Item key={href} href={href} label={label} current={current} />
            ))}
          </nav>
        ) : null}
        <main id="main" className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
