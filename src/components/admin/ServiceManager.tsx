"use client";

import { useState, useTransition } from "react";
import { formatDuration, formatMoney } from "@/lib/format";
import { saveService } from "@/server/admin-actions";
import type { ServiceRow } from "@/types/domain";

const empty = { name: "", description: "", durationMinutes: 60, price: 0, isActive: true, sortOrder: 10 };

export function ServiceManager({ services, currency }: { services: ServiceRow[]; currency: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(form: FormData, id?: string) {
    setError(null);
    start(async () => {
      const result = await saveService({
        id,
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        durationMinutes: Number(form.get("durationMinutes")),
        price: Number(form.get("price")),
        isActive: form.get("isActive") === "on",
        sortOrder: Number(form.get("sortOrder") ?? 0),
      });
      if (!result.ok) setError(result.error ?? "Could not save.");
      else {
        setEditing(null);
        window.location.reload();
      }
    });
  }

  return (
    <div className="mt-8 grid gap-4">
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
        {services.map((service) => (
          <li key={service.id} className="px-4 py-4">
            {editing === service.id ? (
              <ServiceFields
                pending={pending}
                defaults={{
                  name: service.name,
                  description: service.description,
                  durationMinutes: service.duration_minutes,
                  price: service.price_cents / 100,
                  isActive: service.is_active,
                  sortOrder: service.sort_order,
                }}
                onSubmit={(form) => submit(form, service.id)}
              />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-2xl">{service.name}</p>
                  <p className="text-sm text-ink/60">{formatDuration(service.duration_minutes)} · {formatMoney(service.price_cents, currency)} · {service.is_active ? "Active" : "Hidden"}</p>
                </div>
                <button type="button" className="min-h-11 border border-ink/15 px-3 text-sm" onClick={() => setEditing(service.id)}>Edit</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="border border-ink/10 bg-white p-4">
        <h2 className="font-serif text-2xl">Add service</h2>
        <ServiceFields pending={pending} defaults={empty} onSubmit={(form) => submit(form)} />
      </div>
    </div>
  );
}

function ServiceFields({
  defaults,
  onSubmit,
  pending,
}: {
  defaults: typeof empty;
  onSubmit: (form: FormData) => void;
  pending: boolean;
}) {
  return (
    <form className="mt-3 grid gap-3" onSubmit={(event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); }}>
      <label className="grid gap-1 text-sm">Name<input name="name" defaultValue={defaults.name} required /></label>
      <label className="grid gap-1 text-sm">Description<textarea name="description" defaultValue={defaults.description} /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">Minutes<input name="durationMinutes" type="number" min={15} max={720} defaultValue={defaults.durationMinutes} required /></label>
        <label className="grid gap-1 text-sm">Price<input name="price" type="number" min={0} step="0.01" defaultValue={defaults.price} required /></label>
        <label className="grid gap-1 text-sm">Order<input name="sortOrder" type="number" min={0} defaultValue={defaults.sortOrder} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={defaults.isActive} className="h-4 w-4" /> Active</label>
      <button disabled={pending} className="min-h-12 bg-ink text-[0.72rem] uppercase tracking-[0.16em] text-paper" type="submit">Save service</button>
    </form>
  );
}
