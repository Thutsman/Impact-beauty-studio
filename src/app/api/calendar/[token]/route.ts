import { NextResponse } from "next/server";
import { loadAppointment } from "@/server/public-data";

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const appointment = await loadAppointment(token);
  if (!appointment) return new NextResponse("Not found", { status: 404 });

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Impact Beauty Studio//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${token}@impact-beauty-studio`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(appointment.starts_at)}`,
    `DTEND:${icsDate(appointment.ends_at)}`,
    `SUMMARY:${icsText(`${appointment.service_name} — ${appointment.display_name}`)}`,
    `DESCRIPTION:${icsText("Appointment with Impact Beauty Studio by Vee")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=impact-beauty-studio.ics",
    },
  });
}
