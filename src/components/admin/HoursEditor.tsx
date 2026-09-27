"use client";

import { useState, useTransition } from "react";
import { WEEKDAYS } from "@/lib/format";
import { saveHours } from "@/server/admin-actions";
import type { HoursRow } from "@/types/domain";

export function HoursEditor({ hours }: { hours: HoursRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byDay = new Map(hours.map((row) => [row.day_of_week, row]));

  return (
    <form
      className="mt-8 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const rows = WEEKDAYS.map((_, day) => ({
          day,
          closed: data.get(`closed-${day}`) === "on",
          open: String(data.get(`open-${day}`) ?? "08:00"),
          close: String(data.get(`close-${day}`) ?? "17:00"),
        }));
        setError(null);
        start(async () => {
          const result = await saveHours(rows);
          if (!result.ok) setError(result.error ?? "Could not save.");
        });
      }}
    >
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {WEEKDAYS.map((label, day) => {
        const row = byDay.get(day);
        const closed = row?.is_closed ?? true;
        return (
          <fieldset key={label} className="grid gap-3 border border-ink/10 bg-white p-4 sm:grid-cols-[8rem_auto_1fr_1fr] sm:items-center">
            <legend className="sr-only">{label}</legend>
            <p className="font-medium">{label}</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`closed-${day}`} defaultChecked={closed} className="h-4 w-4" /> Closed
            </label>
            <label className="text-sm">Opens<input className="mt-1" type="time" name={`open-${day}`} defaultValue={(row?.open_time ?? "08:00").slice(0, 5)} /></label>
            <label className="text-sm">Closes<input className="mt-1" type="time" name={`close-${day}`} defaultValue={(row?.close_time ?? "17:00").slice(0, 5)} /></label>
          </fieldset>
        );
      })}
      <button disabled={pending} className="min-h-12 bg-ink px-5 text-[0.72rem] uppercase tracking-[0.16em] text-paper" type="submit">Save hours</button>
    </form>
  );
}
