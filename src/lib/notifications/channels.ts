import { formatClock, formatLongDate, formatMoney } from "@/lib/format";

export type NoticeKind = "confirmation" | "reminder_24h" | "cancellation" | "reschedule";

export type Notice = {
  kind: NoticeKind;
  toEmail: string | null;
  toPhone: string | null;
  name: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  displayName: string;
  manageUrl: string;
  priceCents?: number;
  currencyCode?: string;
};

export type ChannelResult = {
  channel: "email" | "whatsapp";
  status: "sent" | "failed" | "skipped";
  error?: string;
};

const subjects: Record<NoticeKind, string> = {
  confirmation: "Your appointment is confirmed",
  reminder_24h: "Reminder: your appointment is tomorrow",
  cancellation: "Your appointment has been cancelled",
  reschedule: "Your appointment has been rescheduled",
};

function body(notice: Notice): string {
  const when = `${formatLongDate(notice.startsAt, notice.timezone)}\n${formatClock(notice.startsAt, notice.timezone)} – ${formatClock(notice.endsAt, notice.timezone)}`;
  const price =
    notice.priceCents != null && notice.currencyCode
      ? `\n${formatMoney(notice.priceCents, notice.currencyCode)}`
      : "";
  const intro: Record<NoticeKind, string> = {
    confirmation: "Your appointment is confirmed.",
    reminder_24h: "This is a reminder of your upcoming appointment.",
    cancellation: "Your appointment has been cancelled. The time is now available for someone else.",
    reschedule: "Your appointment has been rescheduled.",
  };

  return [
    notice.displayName,
    "",
    `Hello ${notice.name},`,
    "",
    intro[notice.kind],
    "",
    notice.serviceName + price,
    when,
    "",
    `Manage your appointment:\n${notice.manageUrl}`,
    "",
    notice.kind === "confirmation" || notice.kind === "reminder_24h"
      ? "You will receive a reminder before your appointment."
      : "",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n")
    .trim();
}

export async function sendEmail(notice: Notice): Promise<ChannelResult> {
  if (!notice.toEmail) {
    return { channel: "email", status: "skipped", error: "No email address was provided." };
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!apiKey || !from) {
    return { channel: "email", status: "skipped", error: "Email delivery is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [notice.toEmail],
      subject: `${subjects[notice.kind]} — ${notice.displayName}`,
      text: body(notice),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { channel: "email", status: "failed", error: error.slice(0, 500) };
  }
  return { channel: "email", status: "sent" };
}

/**
 * Future WhatsApp channel. V1 records the intention and does not send.
 */
export async function sendWhatsApp(notice: Notice): Promise<ChannelResult> {
  if (!notice.toPhone) {
    return { channel: "whatsapp", status: "skipped", error: "No mobile number was provided." };
  }
  return {
    channel: "whatsapp",
    status: "skipped",
    error: "WhatsApp delivery is not enabled yet.",
  };
}

export async function dispatchNotice(notice: Notice): Promise<ChannelResult[]> {
  const [email, whatsapp] = await Promise.all([sendEmail(notice), sendWhatsApp(notice)]);
  return [email, whatsapp];
}
