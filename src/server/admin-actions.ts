"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { zonedTimeToUtc } from "@/lib/time";
import { blockSchema, serviceInputSchema, settingsSchema } from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/admin-data";

async function staff() {
  const session = await getSession();
  if (!session?.supabase || !session.user || !session.profile) {
    return { error: "Please sign in as the studio owner." as const };
  }
  const { data: settings } = await session.supabase
    .from("booking_settings")
    .select("timezone")
    .eq("business_id", session.profile.business_id)
    .single();
  return { supabase: session.supabase, profile: session.profile, timezone: settings?.timezone as string };
}

function fail(error: { message: string } | null, fallback: string) {
  return { ok: false as const, error: error?.message || fallback };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/admin");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.session) {
    return { error: "Account created. Confirm the email in Supabase, then sign in and enter the setup key." };
  }
  redirect("/admin/setup");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function claimOwner(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const { data, error } = await supabase.rpc("ibs_claim_owner", {
    p_setup_key: String(formData.get("setupKey") ?? ""),
  });
  if (error) return { error: error.message };
  if (!data?.ok) return { error: data?.error ?? "The studio could not be linked." };
  redirect("/admin");
}

export async function saveService(input: {
  id?: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  sortOrder: number;
}) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const parsed = serviceInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the service details." };
  const row = {
    business_id: ctx.profile.business_id,
    name: parsed.data.name,
    description: parsed.data.description,
    duration_minutes: parsed.data.durationMinutes,
    price_cents: Math.round(parsed.data.price * 100),
    is_active: parsed.data.isActive,
    sort_order: parsed.data.sortOrder,
  };
  const query = parsed.data.id
    ? ctx.supabase.from("services").update(row).eq("id", parsed.data.id)
    : ctx.supabase.from("services").insert(row);
  const { error } = await query;
  if (error) return fail(error, "The service could not be saved.");
  revalidatePath("/admin/services");
  revalidatePath("/");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function saveHours(rows: { day: number; closed: boolean; open: string; close: string }[]) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  for (const row of rows) {
    const payload = {
      business_id: ctx.profile.business_id,
      day_of_week: row.day,
      is_closed: row.closed,
      open_time: row.closed ? null : row.open,
      close_time: row.closed ? null : row.close,
    };
    const { error } = await ctx.supabase.from("business_hours").upsert(payload, { onConflict: "business_id,day_of_week" });
    if (error) return fail(error, "Business hours could not be saved.");
  }
  revalidatePath("/admin/hours");
  return { ok: true as const };
}

export async function addBlock(input: { date: string; start: string; end: string; label: string; notes: string }) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the blocked time." };
  const starts = zonedTimeToUtc(parsed.data.date, parsed.data.start, ctx.timezone);
  const ends = zonedTimeToUtc(parsed.data.date, parsed.data.end, ctx.timezone);
  if (ends <= starts) return { ok: false as const, error: "The end time must be after the start time." };
  const { error } = await ctx.supabase.from("blocked_times").insert({
    business_id: ctx.profile.business_id,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    label: parsed.data.label,
    notes: parsed.data.notes || null,
  });
  if (error) return fail(error, "The blocked time could not be saved.");
  revalidatePath("/admin/blocked");
  return { ok: true as const };
}

export async function deleteBlock(id: string) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { error } = await ctx.supabase.from("blocked_times").delete().eq("id", id);
  if (error) return fail(error, "The blocked time could not be removed.");
  revalidatePath("/admin/blocked");
  return { ok: true as const };
}

export async function saveSettings(input: {
  displayName: string;
  tagline: string;
  whatsappPhone: string;
  timezone: string;
  currencyCode: string;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
}) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the settings." };
  const { error: businessError } = await ctx.supabase
    .from("businesses")
    .update({
      display_name: parsed.data.displayName,
      tagline: parsed.data.tagline,
      whatsapp_phone: parsed.data.whatsappPhone,
    })
    .eq("id", ctx.profile.business_id);
  if (businessError) return fail(businessError, "The studio details could not be saved.");
  const { error } = await ctx.supabase
    .from("booking_settings")
    .update({
      timezone: parsed.data.timezone,
      currency_code: parsed.data.currencyCode,
      slot_interval_minutes: parsed.data.slotIntervalMinutes,
      min_notice_minutes: parsed.data.minNoticeMinutes,
      max_advance_days: parsed.data.maxAdvanceDays,
    })
    .eq("business_id", ctx.profile.business_id);
  if (error) return fail(error, "Settings could not be saved.");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true as const };
}

export async function createManualAppointment(input: {
  serviceId: string;
  startsAt: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { data, error } = await ctx.supabase.rpc("ibs_admin_create_appointment", {
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_email: input.email,
    p_notes: input.notes,
  });
  if (error) return { ok: false as const, error: "This time is already occupied." };
  if (!data?.ok) return { ok: false as const, error: data?.error ?? "This time is already occupied." };
  revalidatePath("/admin");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/calendar");
  return { ok: true as const, id: data.id as string };
}

export async function staffSlots(serviceId: string, date: string, excludeId?: string) {
  const ctx = await staff();
  if ("error" in ctx) return { slots: [], reason: "unavailable" };
  const { data, error } = await ctx.supabase.rpc("ibs_staff_slots", {
    p_service_id: serviceId,
    p_date: date,
    p_exclude: excludeId ?? null,
  });
  if (error || !data) return { slots: [], reason: "unavailable" };
  return data as { slots: { starts_at: string; ends_at: string }[]; reason: string | null };
}

export async function setAppointmentStatus(id: string, status: string) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { data, error } = await ctx.supabase.rpc("ibs_admin_set_status", { p_id: id, p_status: status });
  if (error || !data?.ok) return { ok: false as const, error: data?.error ?? "The status could not be updated." };
  revalidatePath("/admin");
  revalidatePath(`/admin/appointments/${id}`);
  return { ok: true as const };
}

export async function rescheduleStaffAppointment(id: string, startsAt: string) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { data, error } = await ctx.supabase.rpc("ibs_admin_reschedule", { p_id: id, p_starts_at: startsAt });
  if (error || !data?.ok) return { ok: false as const, error: data?.error ?? "This time is already occupied." };
  revalidatePath(`/admin/appointments/${id}`);
  revalidatePath("/admin/calendar");
  return { ok: true as const };
}

export async function updateAppointmentDetails(input: {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { data, error } = await ctx.supabase.rpc("ibs_admin_update_details", {
    p_id: input.id,
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_email: input.email,
    p_notes: input.notes,
  });
  if (error || !data?.ok) return { ok: false as const, error: data?.error ?? "The appointment could not be updated." };
  revalidatePath(`/admin/appointments/${input.id}`);
  return { ok: true as const };
}

export async function updateCustomerNotes(id: string, notes: string) {
  const ctx = await staff();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { error } = await ctx.supabase.from("customers").update({ notes }).eq("id", id);
  if (error) return fail(error, "Notes could not be saved.");
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true as const };
}
