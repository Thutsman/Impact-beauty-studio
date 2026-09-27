"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatClock, formatDuration, formatLongDate, formatMoney, formatTime, slotMessage } from "@/lib/format";
import { fetchSlots, submitBooking } from "@/server/booking-actions";
import type { PublicContext, Slot } from "@/types/domain";

const steps = ["Service", "Date & time", "Your details", "Confirmation"];

export function BookingWizard({ context, today, latest }: { context: PublicContext; today: string; latest: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(context.services[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const service = context.services.find((item) => item.id === serviceId);

  function loadDate(nextDate: string, nextService = serviceId) {
    setDate(nextDate);
    setSlot(null);
    setError(null);
    startTransition(async () => {
      const result = await fetchSlots(nextService, nextDate);
      setSlots(result.slots);
      setReason(result.reason);
    });
  }

  function continueFromService() {
    if (!service) return;
    setStep(1);
    loadDate(date, service.id);
  }

  function submit() {
    if (!service || !slot) return;
    setError(null);
    startTransition(async () => {
      const result = await submitBooking({
        serviceId: service.id,
        startsAt: slot.starts_at,
        fullName,
        phone,
        email,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        if (result.error.toLowerCase().includes("time")) {
          setStep(1);
          loadDate(date, service.id);
        }
        return;
      }
      router.push(`/book/confirmed/${result.token}`);
    });
  }

  const summary = useMemo(() => {
    if (!service || !slot) return null;
    return {
      service: service.name,
      when: formatLongDate(slot.starts_at, context.settings.timezone),
      time: `${formatClock(slot.starts_at, context.settings.timezone)} – ${formatClock(slot.ends_at, context.settings.timezone)}`,
      price: formatMoney(service.price_cents, context.settings.currency_code),
    };
  }, [service, slot, context.settings]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:py-16">
      <p className="text-[0.72rem] uppercase tracking-[0.28em] text-gold">Book</p>
      <h1 className="mt-3 font-serif text-4xl text-foreground md:text-5xl">Your appointment</h1>
      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Booking progress">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined}>
            <p className={`text-[0.65rem] uppercase tracking-[0.14em] ${index === step ? "text-gold" : "text-muted"}`}>
              0{index + 1}
            </p>
            <p className="mt-1 hidden text-sm sm:block">{label}</p>
            <span className={`mt-2 block h-px ${index <= step ? "bg-gold" : "bg-line"}`} />
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">Step {step + 1} of 4, {steps[step]}</p>

      {error ? <p role="alert" className="mt-6 border border-danger/40 bg-surface px-4 py-3 text-sm text-gold-soft">{error}</p> : null}

      {step === 0 ? (
        <fieldset className="mt-8">
          <legend className="font-serif text-2xl">Select a service</legend>
          <div className="mt-5 grid gap-3">
            {context.services.map((item) => {
              const selected = item.id === serviceId;
              return (
                <label key={item.id} className={`block cursor-pointer border p-5 transition ${selected ? "border-gold bg-surface" : "border-line hover:border-gold/70"}`}>
                  <input
                    type="radio"
                    name="service"
                    className="sr-only"
                    checked={selected}
                    onChange={() => setServiceId(item.id)}
                  />
                  <span className="flex items-start justify-between gap-4">
                    <span>
                      <span className="block font-serif text-2xl">{item.name}</span>
                      <span className="mt-2 block text-sm leading-6 text-muted">{item.description}</span>
                    </span>
                    <span className="shrink-0 text-right text-[0.72rem] uppercase tracking-[0.14em] text-gold">
                      {formatDuration(item.duration_minutes)}
                      <span className="mt-1 block">{formatMoney(item.price_cents, context.settings.currency_code)}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <button type="button" className="mt-6 inline-flex min-h-12 items-center bg-gold px-6 text-[0.72rem] uppercase tracking-[0.18em] text-ink" onClick={continueFromService} disabled={!service}>
            Continue
          </button>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <div className="mt-8">
          <h2 className="font-serif text-2xl">Date and time</h2>
          <label className="mt-5 block text-[0.72rem] uppercase tracking-[0.16em] text-muted" htmlFor="booking-date">Date</label>
          <input id="booking-date" type="date" min={today} max={latest} value={date} onChange={(event) => loadDate(event.target.value)} className="mt-2 max-w-xs" />
          <p className="mt-6 text-[0.72rem] uppercase tracking-[0.16em] text-gold">Available times</p>
          {pending && !slots.length ? <p className="mt-4 text-sm text-muted">Checking the diary…</p> : null}
          {slots.length ? (
            <div role="radiogroup" aria-label="Available times" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((item) => {
                const selected = slot?.starts_at === item.starts_at;
                return (
                  <button
                    key={item.starts_at}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSlot(item)}
                    className={`min-h-12 border text-sm ${selected ? "border-gold bg-gold text-ink" : "border-line text-foreground hover:border-gold"}`}
                  >
                    {formatTime(item.starts_at, context.settings.timezone)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">{pending ? "Checking the diary…" : slotMessage(reason)}</p>
          )}
          <div className="mt-6 flex gap-3">
            <button type="button" className="min-h-12 border border-line px-5 text-[0.72rem] uppercase tracking-[0.16em]" onClick={() => setStep(0)}>Back</button>
            <button type="button" className="min-h-12 bg-gold px-6 text-[0.72rem] uppercase tracking-[0.18em] text-ink disabled:opacity-50" disabled={!slot} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <form
          className="mt-8 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setStep(3);
          }}
        >
          <h2 className="font-serif text-2xl">Your details</h2>
          <label className="grid gap-2 text-sm" htmlFor="full-name">Full name
            <input id="full-name" name="fullName" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm" htmlFor="phone">WhatsApp / mobile number
            <input id="phone" name="phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm" htmlFor="email">Email <span className="text-muted">(optional)</span>
            <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm" htmlFor="notes">Notes <span className="text-muted">(optional)</span>
            <textarea id="notes" name="notes" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <div className="flex gap-3">
            <button type="button" className="min-h-12 border border-line px-5 text-[0.72rem] uppercase tracking-[0.16em]" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="min-h-12 bg-gold px-6 text-[0.72rem] uppercase tracking-[0.18em] text-ink">Review</button>
          </div>
        </form>
      ) : null}

      {step === 3 && summary ? (
        <div className="mt-8 border border-line bg-elevated p-6 sm:p-8">
          <h2 className="font-serif text-3xl">Confirm your appointment</h2>
          <dl className="mt-6 grid gap-4 text-sm">
            <div><dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">Service</dt><dd className="mt-1 text-lg">{summary.service}</dd></div>
            <div><dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">When</dt><dd className="mt-1">{summary.when}<br />{summary.time}</dd></div>
            <div><dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">Price</dt><dd className="mt-1">{summary.price}</dd></div>
            <div><dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">Name</dt><dd className="mt-1">{fullName}</dd></div>
            <div><dt className="text-[0.72rem] uppercase tracking-[0.16em] text-muted">Mobile</dt><dd className="mt-1">{phone}</dd></div>
          </dl>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="min-h-12 border border-line px-5 text-[0.72rem] uppercase tracking-[0.16em]" onClick={() => setStep(2)}>Back</button>
            <button type="button" className="min-h-12 bg-gold px-6 text-[0.72rem] uppercase tracking-[0.18em] text-ink disabled:opacity-50" disabled={pending} onClick={submit}>
              {pending ? "Confirming…" : "Confirm appointment"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
