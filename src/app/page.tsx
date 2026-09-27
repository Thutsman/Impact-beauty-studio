import { PublicFrame } from "@/components/site/PublicFrame";
import { WorkGallery } from "@/components/site/WorkGallery";
import { Slideshow } from "@/components/site/Slideshow";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatMoney } from "@/lib/format";
import { loadPublicContext } from "@/server/public-data";
import { heroSlides } from "@/lib/work";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const context = await loadPublicContext();

  return (
    <PublicFrame>
      <section className="bg-background">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div className="rise">
            <Logo variant="hero" />
            <p className="mt-8 text-[0.72rem] uppercase tracking-[0.28em] text-muted">Premium wig installation and makeup</p>
            <h1 className="mt-4 max-w-xl font-serif text-[2.7rem] leading-[1.02] text-foreground sm:text-6xl md:text-7xl">
              Beauty that makes an impact.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-muted">Your beauty. Your confidence. Your impact.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/book">Book an appointment</Button>
              <Button href="#work" variant="ghost">View the work</Button>
            </div>
          </div>
          <aside className="border border-line bg-elevated">
            <Slideshow slides={heroSlides} />
          </aside>
        </div>
      </section>

      <WorkGallery />

      <section id="services" className="bg-paper text-ink">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <p className="text-[0.72rem] uppercase tracking-[0.28em] text-gold-deep">Services</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">The appointment</h2>
          <hr className="gold-rule mt-6" />
          {context?.services.length ? (
            <ul className="mt-10 grid gap-px bg-ink/10 md:grid-cols-3">
              {context.services.map((service) => (
                <li key={service.id} className="bg-paper p-6 sm:p-8">
                  <h3 className="font-serif text-3xl">{service.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink/70">{service.description}</p>
                  <p className="mt-6 text-[0.72rem] uppercase tracking-[0.16em] text-gold-deep">
                    {formatDuration(service.duration_minutes)} · {formatMoney(service.price_cents, context.settings.currency_code)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 max-w-lg text-sm leading-7 text-ink/70">
              Services will appear here once the studio catalog is connected.
            </p>
          )}
        </div>
      </section>

      <section className="bg-elevated">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
          <p className="text-[0.72rem] uppercase tracking-[0.28em] text-gold">Why book online</p>
          <h2 className="mt-3 max-w-xl font-serif text-4xl text-foreground md:text-5xl">A clear time. A confirmed appointment.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              ["01", "Choose your service.", "Wig installation, makeup, or both."],
              ["02", "Pick a time that works for you.", "Only times that are actually open are shown."],
              ["03", "Receive instant confirmation.", "Keep the link if you need to reschedule or cancel."],
            ].map(([index, title, copy]) => (
              <li key={index}>
                <p className="text-[0.72rem] tracking-[0.2em] text-gold">{index}</p>
                <h3 className="mt-3 font-serif text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-24">
          <hr className="gold-rule mx-auto" />
          <h2 className="mt-8 font-serif text-4xl md:text-6xl">Ready for your appointment?</h2>
          <div className="mt-8">
            <Button href="/book">Book now</Button>
          </div>
        </div>
      </section>
    </PublicFrame>
  );
}
