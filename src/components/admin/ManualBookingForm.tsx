"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatTime, slotMessage } from "@/lib/format";
import { createManualAppointment, staffSlots } from "@/server/admin-actions";
import type { ServiceRow, Slot } from "@/types/domain";

export function ManualBookingForm({ services, today, timezone }: { services: ServiceRow[]; today: string; timezone: string }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!serviceId) return;
    startTransition(async () => {
      const result = await staffSlots(serviceId, date);
      setSlots(result.slots);
      setReason(result.reason);
    });
    // Initial diary load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load(nextService = serviceId, nextDate = date) {
    setServiceId(nextService);
    setDate(nextDate);
    setStartsAt("");
    startTransition(async () => {
      const result = await staffSlots(nextService, nextDate);
      setSlots(result.slots);
      setReason(result.reason);
    });
  }

  return (
    <form
      className="mt-8 grid max-w-xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await createManualAppointment({
            serviceId,
            startsAt,
            fullName: String(data.get("fullName") ?? ""),
            phone: String(data.get("phone") ?? ""),
            email: String(data.get("email") ?? ""),
            notes: String(data.get("notes") ?? ""),
          });
          if (!result.ok) setError(result.error);
          else router.push(`/admin/appointments/${result.id}`);
        });
      }}
    >
      {error ? <p role="alert" className="border border-danger/30 bg-white px-4 py-3 text-sm text-danger">{error}</p> : null}
      <label className="grid gap-2 text-sm">Customer
        <input name="fullName" required autoComplete="name" />
      </label>
      <label className="grid gap-2 text-sm">Phone
        <input name="phone" type="tel" required />
      </label>
      <label className="grid gap-2 text-sm">Email <span className="text-ink/50">(optional)</span>
        <input name="email" type="email" />
      </label>
      <label className="grid gap-2 text-sm">Service
        <select value={serviceId} onChange={(event) => load(event.target.value, date)}>
          {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm">Date
        <input type="date" value={date} min={today} onChange={(event) => load(serviceId, event.target.value)} className="max-w-xs" />
      </label>
      <fieldset>
        <legend className="text-sm">Time</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((slot) => (
            <button key={slot.starts_at} type="button" onClick={() => setStartsAt(slot.starts_at)} className={`min-h-12 border text-sm ${startsAt === slot.starts_at ? "border-gold bg-gold text-ink" : "border-ink/15 bg-white"}`}>
              {formatTime(slot.starts_at, timezone)}
            </button>
          ))}
        </div>
        {!slots.length ? <p className="mt-2 text-sm text-ink/60">{pending ? "Checking…" : slotMessage(reason ?? "unavailable")}</p> : null}
      </fieldset>
      <label className="grid gap-2 text-sm">Notes
        <textarea name="notes" />
      </label>
      <button type="submit" disabled={!startsAt || pending} className="min-h-12 bg-ink text-[0.72rem] uppercase tracking-[0.16em] text-paper disabled:opacity-50">
        {pending ? "Saving…" : "Save appointment"}
      </button>
    </form>
  );
}
