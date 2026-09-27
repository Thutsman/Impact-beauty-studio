import { PublicFrame } from "@/components/site/PublicFrame";
import { Button } from "@/components/ui/Button";

export function InvalidLink() {
  return (
    <PublicFrame compact>
      <article className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-5 py-16">
        <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold">Impact Beauty Studio</p>
        <h1 className="mt-4 font-serif text-4xl">This appointment link is not valid.</h1>
        <p className="mt-4 text-sm leading-7 text-muted">Use the link from your confirmation, or book a new appointment.</p>
        <div className="mt-8">
          <Button href="/book">Book an appointment</Button>
        </div>
      </article>
    </PublicFrame>
  );
}
