"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/server/admin-actions";

export function SettingsForm({
  displayName,
  tagline,
  whatsappPhone,
  timezone,
  currencyCode,
  slotIntervalMinutes,
  minNoticeMinutes,
  maxAdvanceDays,
  emailConfigured,
}: {
  displayName: string;
  tagline: string;
  whatsappPhone: string;
  timezone: string;
  currencyCode: string;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  emailConfigured: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-8 grid max-w-xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSaved(false);
        start(async () => {
          const result = await saveSettings({
            displayName: String(data.get("displayName") ?? ""),
            tagline: String(data.get("tagline") ?? ""),
            whatsappPhone: String(data.get("whatsappPhone") ?? ""),
            timezone: String(data.get("timezone") ?? ""),
            currencyCode: String(data.get("currencyCode") ?? ""),
            slotIntervalMinutes: Number(data.get("slotIntervalMinutes")),
            minNoticeMinutes: Number(data.get("minNoticeMinutes")),
            maxAdvanceDays: Number(data.get("maxAdvanceDays")),
          });
          if (!result.ok) setError(result.error ?? "Could not save.");
          else setSaved(true);
        });
      }}
    >
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {saved ? <p role="status" className="text-sm">Saved.</p> : null}
      <label className="grid gap-1 text-sm">Display name<input name="displayName" defaultValue={displayName} required /></label>
      <label className="grid gap-1 text-sm">Tagline<input name="tagline" defaultValue={tagline} /></label>
      <label className="grid gap-1 text-sm">WhatsApp number<input name="whatsappPhone" type="tel" defaultValue={whatsappPhone} required /></label>
      <label className="grid gap-1 text-sm">Timezone
        <input name="timezone" defaultValue={timezone} required list="timezones" />
      </label>
      <datalist id="timezones">
        {["Africa/Johannesburg", "Africa/Harare", "Europe/London", "America/New_York"].map((zone) => <option key={zone} value={zone} />)}
      </datalist>
      <label className="grid gap-1 text-sm">Currency<input name="currencyCode" defaultValue={currencyCode} maxLength={3} required /></label>
      <label className="grid gap-1 text-sm">Booking interval (minutes)<input name="slotIntervalMinutes" type="number" min={5} max={180} defaultValue={slotIntervalMinutes} /></label>
      <label className="grid gap-1 text-sm">Minimum notice (minutes)<input name="minNoticeMinutes" type="number" min={0} defaultValue={minNoticeMinutes} /></label>
      <label className="grid gap-1 text-sm">How far ahead clients can book (days)<input name="maxAdvanceDays" type="number" min={1} max={365} defaultValue={maxAdvanceDays} /></label>
      <p className="text-sm text-ink/70">
        Email reminders are {emailConfigured ? "configured." : "not configured. Add RESEND_API_KEY and NOTIFICATION_FROM_EMAIL, then set CRON_SECRET for the reminder route."} The WhatsApp number is shown on the site so clients can message Yvonnie after they book. Appointments still have to be made on the website.
      </p>
      <button disabled={pending} className="min-h-12 bg-ink text-[0.72rem] uppercase tracking-[0.16em] text-paper" type="submit">Save settings</button>
    </form>
  );
}
