"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deliverBookingEmail, bookResultSchema } from "@/lib/notifications/deliver";
import { createPublicClient } from "@/lib/supabase/public";
import { publicConfig } from "@/lib/supabase/env";
import { detailsSchema } from "@/lib/validators";
import { loadSlots, loadTokenSlots } from "@/server/public-data";

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function fetchSlots(serviceId: string, date: string) {
  if (!uuid.safeParse(serviceId).success || !day.safeParse(date).success) {
    return { slots: [], reason: "unavailable" };
  }
  return loadSlots(serviceId, date);
}

export async function fetchTokenSlots(token: string, date: string) {
  if (!/^[0-9a-f]{64}$/.test(token) || !day.safeParse(date).success) {
    return { slots: [], reason: "unavailable" };
  }
  return loadTokenSlots(token, date);
}

export async function submitBooking(input: {
  serviceId: string;
  startsAt: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}) {
  const config = publicConfig();
  const supabase = createPublicClient();
  if (!config || !supabase) return { ok: false as const, error: "Booking is not available right now." };

  const details = detailsSchema.safeParse(input);
  if (!details.success) return { ok: false as const, error: details.error.issues[0]?.message ?? "Please check your details." };
  if (!uuid.safeParse(input.serviceId).success || Number.isNaN(Date.parse(input.startsAt))) {
    return { ok: false as const, error: "Please select an appointment time." };
  }

  const { data, error } = await supabase.rpc("ibs_book_appointment", {
    p_slug: config.slug,
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_full_name: details.data.fullName,
    p_phone: details.data.phone,
    p_email: details.data.email,
    p_notes: details.data.notes,
  });

  if (error) return { ok: false as const, error: "That time could not be booked. Please choose another." };
  const parsed = bookResultSchema.safeParse(data);
  if (!parsed.success || !parsed.data.ok || !parsed.data.appointment) {
    const message = data && typeof data === "object" && "error" in data ? String(data.error) : "That time could not be booked.";
    return { ok: false as const, error: message };
  }

  const appointment = parsed.data.appointment;
  await deliverBookingEmail({
    kind: "confirmation",
    token: appointment.manage_token,
    notificationId: parsed.data.notification_id,
    name: appointment.customer_name,
    email: appointment.customer_email,
    phone: details.data.phone,
    serviceName: appointment.service_name,
    startsAt: appointment.starts_at,
    endsAt: appointment.ends_at,
    timezone: appointment.timezone,
    displayName: appointment.display_name,
    priceCents: appointment.price_cents,
    currencyCode: appointment.currency_code,
  });

  return { ok: true as const, token: appointment.manage_token };
}

export async function cancelAppointment(token: string) {
  const supabase = createPublicClient();
  if (!supabase || !/^[0-9a-f]{64}$/.test(token)) {
    return { ok: false as const, error: "This appointment link is not valid." };
  }
  const { data, error } = await supabase.rpc("ibs_cancel_appointment", { p_token: token });
  if (error || !data?.ok) return { ok: false as const, error: data?.error ?? "This appointment could not be cancelled." };

  const appointment = data.appointment;
  if (appointment?.customer_email) {
    await deliverBookingEmail({
      kind: "cancellation",
      token,
      notificationId: data.notification_id,
      name: appointment.customer_name,
      email: appointment.customer_email,
      phone: null,
      serviceName: appointment.service_name,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      timezone: appointment.timezone,
      displayName: appointment.display_name,
    });
  }
  revalidatePath(`/appointment/manage/${token}`);
  return { ok: true as const };
}

export async function rescheduleAppointment(token: string, startsAt: string) {
  const supabase = createPublicClient();
  if (!supabase || !/^[0-9a-f]{64}$/.test(token) || Number.isNaN(Date.parse(startsAt))) {
    return { ok: false as const, error: "Please select an appointment time." };
  }
  const { data, error } = await supabase.rpc("ibs_reschedule_appointment", {
    p_token: token,
    p_starts_at: startsAt,
  });
  if (error || !data?.ok) {
    return { ok: false as const, error: data?.error ?? "That time could not be reserved." };
  }
  const appointment = data.appointment;
  if (appointment?.customer_email) {
    await deliverBookingEmail({
      kind: "reschedule",
      token,
      notificationId: data.notification_id,
      name: appointment.customer_name,
      email: appointment.customer_email,
      phone: null,
      serviceName: appointment.service_name,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      timezone: appointment.timezone,
      displayName: appointment.display_name,
    });
  }
  revalidatePath(`/appointment/manage/${token}`);
  return { ok: true as const };
}
