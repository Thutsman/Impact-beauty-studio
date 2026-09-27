"use client";

import { useState, useTransition } from "react";
import { updateCustomerNotes } from "@/server/admin-actions";

export function CustomerNotes({ id, notes }: { id: string; notes: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-6 grid max-w-xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget).get("notes") ?? "");
        setSaved(false);
        start(async () => {
          const result = await updateCustomerNotes(id, value);
          if (!result.ok) setError(result.error ?? "Could not save.");
          else setSaved(true);
        });
      }}
    >
      <label className="grid gap-2 text-sm" htmlFor="notes">Private notes
        <textarea id="notes" name="notes" defaultValue={notes} />
      </label>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {saved ? <p role="status" className="text-sm">Saved.</p> : null}
      <button type="submit" disabled={pending} className="min-h-12 bg-ink text-[0.72rem] uppercase tracking-[0.16em] text-paper">Save notes</button>
    </form>
  );
}
