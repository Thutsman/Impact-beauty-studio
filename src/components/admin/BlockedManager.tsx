"use client";

import { useState, useTransition } from "react";
import { addBlock, deleteBlock } from "@/server/admin-actions";

const labels = ["Personal", "Lunch", "Holiday", "Fully booked", "Special event", "Travel"];

export function BlockedManager({ today }: { today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-8 grid max-w-xl gap-3 border border-ink/10 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        start(async () => {
          const result = await addBlock({
            date: String(data.get("date") ?? ""),
            start: String(data.get("start") ?? ""),
            end: String(data.get("end") ?? ""),
            label: String(data.get("label") ?? ""),
            notes: String(data.get("notes") ?? ""),
          });
          if (!result.ok) setError(result.error ?? "Could not save.");
          else window.location.reload();
        });
      }}
    >
      <h2 className="font-serif text-2xl">Block a period</h2>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <label className="grid gap-1 text-sm">Date<input type="date" name="date" required defaultValue={today} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">From<input type="time" name="start" required defaultValue="12:00" /></label>
        <label className="grid gap-1 text-sm">Until<input type="time" name="end" required defaultValue="15:00" /></label>
      </div>
      <label className="grid gap-1 text-sm">Reason
        <select name="label">{labels.map((label) => <option key={label}>{label}</option>)}</select>
      </label>
      <label className="grid gap-1 text-sm">Notes<textarea name="notes" /></label>
      <button disabled={pending} className="min-h-12 bg-ink text-[0.72rem] uppercase tracking-[0.16em] text-paper" type="submit">Block time</button>
    </form>
  );
}

export function RemoveBlock({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-danger underline-offset-4 hover:underline"
      onClick={() => start(async () => { await deleteBlock(id); window.location.reload(); })}
    >
      Remove
    </button>
  );
}
