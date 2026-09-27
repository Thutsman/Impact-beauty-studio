import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { publicConfig } from "@/lib/supabase/env";
import { sendEmail } from "@/lib/notifications/channels";

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = createPublicClient();
  const config = publicConfig();
  if (!supabase || !config) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });

  const { data, error } = await supabase.rpc("ibs_pull_notifications", { p_secret: secret });
  if (error || !data?.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let sent = 0;
  for (const item of data.notifications ?? []) {
    const payload = item.payload ?? {};
    const result = await sendEmail({
      kind: item.kind,
      toEmail: item.recipient,
      toPhone: null,
      name: payload.customer_name ?? "there",
      serviceName: payload.service_name ?? "Appointment",
      startsAt: payload.starts_at,
      endsAt: payload.ends_at,
      timezone: payload.timezone ?? "Africa/Johannesburg",
      displayName: payload.display_name ?? "Impact Beauty Studio by Yvonnie",
      manageUrl: `${config.siteUrl}/appointment/manage/${item.manage_token}`,
      priceCents: payload.price_cents,
      currencyCode: payload.currency_code,
    });
    const status = result.status === "skipped" && result.error === "Email delivery is not configured." ? "queued" : result.status;
    await supabase.rpc("ibs_finish_notification_secret", {
      p_secret: secret,
      p_log_id: item.id,
      p_status: status,
      p_error: result.error ?? null,
    });
    if (result.status === "sent") sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
