import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireStaff } from "@/server/admin-data";

export const metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const { business, settings } = await requireStaff();
  return (
    <div>
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold-deep">Settings</p>
      <h1 className="mt-2 font-serif text-4xl">Studio</h1>
      <SettingsForm
        displayName={business.display_name}
        tagline={business.tagline ?? ""}
        whatsappPhone={business.whatsapp_phone ?? ""}
        timezone={settings.timezone}
        currencyCode={settings.currency_code}
        slotIntervalMinutes={settings.slot_interval_minutes}
        minNoticeMinutes={settings.min_notice_minutes}
        maxAdvanceDays={settings.max_advance_days}
        emailConfigured={Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL)}
      />
    </div>
  );
}
