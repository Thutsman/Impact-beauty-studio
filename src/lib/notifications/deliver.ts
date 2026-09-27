import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { publicConfig } from "@/lib/supabase/env";
import { dispatchNotice, type NoticeKind } from "@/lib/notifications/channels";

const appointmentSchema = z.object({
  manage_token: z.string(),
  service_name: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  price_cents: z.number(),
  duration_minutes: z.number(),
  customer_name: z.string(),
  customer_email: z.string().nullable(),
  timezone: z.string(),
  display_name: z.string(),
  currency_code: z.string(),
});

export const bookResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  notification_id: z.string().nullable().optional(),
  appointment: appointmentSchema.optional(),
});

export async function deliverBookingEmail(input: {
  kind: NoticeKind;
  token: string;
  notificationId: string | null | undefined;
  name: string;
  email: string | null;
  phone: string | null;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  displayName: string;
  priceCents?: number;
  currencyCode?: string;
}) {
  const config = publicConfig();
  const manageUrl = `${config?.siteUrl ?? ""}/appointment/manage/${input.token}`;
  const [email] = await dispatchNotice({
    kind: input.kind,
    toEmail: input.email,
    toPhone: input.phone,
    name: input.name,
    serviceName: input.serviceName,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    displayName: input.displayName,
    manageUrl,
    priceCents: input.priceCents,
    currencyCode: input.currencyCode,
  });

  if (!input.notificationId || !input.email) return email;
  if (email.status === "skipped" && email.error === "Email delivery is not configured.") return email;

  const supabase = createPublicClient();
  if (!supabase) return email;
  await supabase.rpc("ibs_finish_notification", {
    p_token: input.token,
    p_log_id: input.notificationId,
    p_status: email.status === "sent" ? "sent" : "failed",
    p_error: email.error ?? null,
  });
  return email;
}
