import { formatClock, formatLongDate } from "@/lib/format";

export function whatsappDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function whatsappHref(phone: string, message?: string): string {
  const digits = whatsappDigits(phone);
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function bookingWhatsAppMessage(input: {
  customerName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
}): string {
  return [
    `Hello Vee, I booked ${input.serviceName}.`,
    `${formatLongDate(input.startsAt, input.timezone)}`,
    `${formatClock(input.startsAt, input.timezone)} – ${formatClock(input.endsAt, input.timezone)}`,
    `My name is ${input.customerName}.`,
  ].join("\n");
}
