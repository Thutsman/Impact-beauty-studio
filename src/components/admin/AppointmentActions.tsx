"use client";

import { useState, useTransition } from "react";
import { formatTime, slotMessage } from "@/lib/format";
import { rescheduleStaffAppointment, setAppointmentStatus, staffSlots, updateAppointmentDetails } from "@/server/admin-actions";
import type { AppointmentRow, Slot } from "@/types/domain";

export function AppointmentActions({
  appointment,
  today,
  timezone,
}: {
  appointment: AppointmentRow;
  today: string;
  timezone: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const active = appointment.status === "pending" || appointment.status === "confirmed";

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      else window.location.reload();
    });
  }

  return (
    <div className="mt-8 grid gap-8">
      {error ? <p role="alert" className="border border-danger/30 bg-white px-4 py-3 text-sm text-danger">{error}</p> : null}
      <form
        className="grid max-w-xl gap-3 border border-ink/10 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          run(() => updateAppointmentDetails({
            id: appointment.id,
            fullName: String(data.get("fullName") ?? ""),
            phone: String(data.get("phone") ?? ""),
            email: String(data.get("email") ?? ""),
            notes: String(data.get("notes") ?? ""),
          }));
        }}
      >
        <h2 className="font-serif text-2xl">Details</h2>
        <label className="grid gap-1 text-sm">Name<input name="fullName" defaultValue={appointment.customer_name} required /></label>
        <label className="grid gap-1 text-sm">Phone<input name="phone" defaultValue={appointment.customer_phone} required /></label>
        <label className="grid gap-1 text-sm">Email<input name="email" type="email" defaultValue={appointment.customer_email ?? ""} /></label>
        <label className="grid gap-1 text-sm">Notes<textarea name="notes" defaultValue={appointment.notes ?? ""} /></label>
        <button type="submit" disabled={pending} className="min-h-12 bg-ink text-[0.72rem] uppercase tracking-[0.16em] text-paper">Save details</button>
      </form>

      <div className="flex flex-wrap gap-2">
        {active ? (
          <>
            <button type="button" className="min-h-11 border border-ink/15 bg-white px-4 text-sm" onClick={() => run(() => setAppointmentStatus(appointment.id, "completed"))}>Mark completed</button>
            <button type="button" className="min-h-11 border border-ink/15 bg-white px-4 text-sm" onClick={() => run(() => setAppointmentStatus(appointment.id, "no_show"))}>Mark no-show</button>
            <button type="button" className="min-h-11 border border-danger/40 bg-white px-4 text-sm text-danger" onClick={() => run(() => setAppointmentStatus(appointment.id, "cancelled"))}>Cancel</button>
          </>
        ) : (
          <button type="button" className="min-h-11 border border-ink/15 bg-white px-4 text-sm" onClick={() => run(() => setAppointmentStatus(appointment.id, "confirmed"))}>Mark confirmed</button>
        )}
      </div>

      {active ? (
        <div className="border border-ink/10 bg-white p-4">
          <h2 className="font-serif text-2xl">Reschedule</h2>
          <label className="mt-3 block text-sm">Date
            <input className="mt-2 max-w-xs" type="date" min={today} value={date} onChange={(event) => {
              const next = event.target.value;
              setDate(next);
              if (!appointment.service_id) return;
              startTransition(async () => {
                const result = await staffSlots(appointment.service_id!, next, appointment.id);
                setSlots(result.slots);
                setReason(result.reason);
              });
            }} />
          </label>
          <p className="mt-3 text-sm text-ink/60">Choose a date to see open times for this service length.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => (
              <button key={slot.starts_at} type="button" className="min-h-12 border border-ink/15 text-sm" onClick={() => run(() => rescheduleStaffAppointment(appointment.id, slot.starts_at))}>
                {formatTime(slot.starts_at, timezone)}
              </button>
            ))}
          </div>
          {!slots.length && reason ? <p className="mt-2 text-sm text-ink/60">{slotMessage(reason)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
