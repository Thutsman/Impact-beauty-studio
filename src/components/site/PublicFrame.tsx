import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { WhatsAppLink } from "@/components/site/WhatsAppLink";
import { MobileNav } from "@/components/site/MobileNav";
import { loadPublicContext } from "@/server/public-data";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="relative border-b border-line bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" aria-label="Impact Beauty Studio home">
          <Logo variant={compact ? "compact" : "header"} />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="hidden text-[0.72rem] uppercase tracking-[0.16em] text-muted hover:text-foreground sm:inline">
            Home
          </Link>
          <Link href="/#work" className="hidden text-[0.72rem] uppercase tracking-[0.16em] text-muted hover:text-foreground sm:inline">
            Work
          </Link>
          <Link href="/#services" className="hidden text-[0.72rem] uppercase tracking-[0.16em] text-muted hover:text-foreground sm:inline">
            Services
          </Link>
          <Link href="/book" className="inline-flex min-h-11 items-center bg-gold px-4 text-[0.72rem] uppercase tracking-[0.16em] text-ink hover:bg-gold-soft">
            Book
          </Link>
          <MobileNav />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ whatsappPhone }: { whatsappPhone?: string | null }) {
  return (
    <footer className="mt-auto border-t border-line bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-serif text-2xl text-foreground">Impact Beauty Studio</p>
          <p className="mt-1 text-sm text-muted">By Vee · Wig installation and makeup</p>
          {whatsappPhone ? (
            <WhatsAppLink phone={whatsappPhone} className="mt-3 inline-block text-sm text-gold hover:text-gold-soft">
              WhatsApp Vee
            </WhatsAppLink>
          ) : null}
        </div>
        <div className="flex gap-6 text-[0.72rem] uppercase tracking-[0.16em] text-muted">
          <Link href="/" className="hover:text-gold">Home</Link>
          <Link href="/#work" className="hover:text-gold">Work</Link>
          <Link href="/book" className="hover:text-gold">Book</Link>
          <Link href="/admin" className="hover:text-gold">Staff</Link>
        </div>
      </div>
    </footer>
  );
}

export async function PublicFrame({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  const context = await loadPublicContext();
  return (
    <>
      <SiteHeader compact={compact} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter whatsappPhone={context?.business.whatsapp_phone} />
    </>
  );
}
