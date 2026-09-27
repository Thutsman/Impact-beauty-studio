"use client";

import { useState, useTransition } from "react";
import { formatTime, slotMessage } from "@/lib/format";
import { cancelAppointment, fetchTokenSlots, rescheduleAppointment } from "@/server/booking-actions";
import type { PublicAppointment, Slot } from "@/types/domain";

export function ManagePanel({
  token,
  appointment,
  today,
  latest,
}: {
  token: string;
  appointment: PublicAppointment;
  today: string;
  latest: string;
}) {
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = appointment.status === "pending" || appointment.status === "confirmed";

  function load(nextDate: string) {
    setDate(nextDate);
    setSelected(null);
    startTransition(async () => {
      const result = await fetchTokenSlots(token, nextDate);
      setSlots(result.slots);
      setReason(result.reason);
    });
  }

  return (
    <div className="mt-8">
      {error ? <p role="alert" className="mb-4 border border-danger/40 px-4 py-3 text-sm">{error}</p> : null}
      {message ? <p role="status" className="mb-4 border border-line px-4 py-3 text-sm text-gold-soft">{message}</p> : null}
      {active ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="min-h-12 border border-line px-5 text-[0.72rem] uppercase tracking-[0.16em]"
            onClick={() => {
              setMode("reschedule");
              load(date);
            }}
          >
            Reschedule
          </button>
          <button
            type="button"
            className="min-h-12 border border-danger/50 px-5 text-[0.72rem] uppercase tracking-[0.16em] text-gold-soft"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Cancel this appointment?")) return;
              setError(null);
              startTransition(async () => {
                const result = await cancelAppointment(token);
                if (!result.ok) setError(result.error);
                else {
                  setMessage("This appointment has been cancelled.");
                  window.location.reload();
                }
              });
            }}
          >
            Cancel appointment
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">This appointment can no longer be changed.</p>
      )}

      {mode === "reschedule" && active ? (
        <div className="mt-8 border border-line p-5">
          <h2 className="font-serif text-2xl">Choose a new time</h2>
          <label className="mt-4 block text-sm" htmlFor="reschedule-date">Date
            <input id="reschedule-date" className="mt-2 max-w-xs" type="date" min={today} max={latest} value={date} onChange={(event) => load(event.target.value)} />
          </label>
          {slots.length ? (
            <div role="radiogroup" aria-label="Available times" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.starts_at}
                  type="button"
                  role="radio"
                  aria-checked={selected === slot.starts_at}
                  onClick={() => setSelected(slot.starts_at)}
                  className={`min-h-12 border text-sm ${selected === slot.starts_at ? "border-gold bg-gold text-ink" : "border-line"}`}
                >
                  {formatTime(slot.starts_at, appointment.timezone)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">{pending ? "Checking the diary…" : slotMessage(reason)}</p>
          )}
          <button
            type="button"
            className="mt-5 min-h-12 bg-gold px-6 text-[0.72rem] uppercase tracking-[0.18em] text-ink disabled:opacity-50"
            disabled={!selected || pending}
            onClick={() => {
              if (!selected) return;
              setError(null);
              startTransition(async () => {
                const result = await rescheduleAppointment(token, selected);
                if (!result.ok) setError(result.error);
                else window.location.reload();
              });
            }}
          >
            {pending ? "Saving…" : "Save new time"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
