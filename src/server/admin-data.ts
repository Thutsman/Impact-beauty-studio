import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentRow, BlockRow, BookingSettings, CustomerSummary, HoursRow, ServiceRow } from "@/types/domain";

const appointmentColumns =
  "id, customer_id, service_id, starts_at, ends_at, status, price_cents, duration_minutes, service_name, customer_name, customer_phone, customer_email, notes, source, payment_status";

export async function getSession() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: data.user };
  const { data: profile } = await supabase
    .from("studio_profiles")
    .select("id, business_id, full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();
  return { supabase, user: data.user, profile };
}

export async function requireStaff() {
  const session = await getSession();
  if (!session?.supabase) redirect("/admin/login?error=config");
  if (!session.user) redirect("/admin/login");
  if (!session.profile) redirect("/admin/setup");

  const { data: business } = await session.supabase
    .from("businesses")
    .select("id, name, display_name, tagline, slug, whatsapp_phone")
    .eq("id", session.profile.business_id)
    .single();
  const { data: settings } = await session.supabase
    .from("booking_settings")
    .select("timezone, currency_code, slot_interval_minutes, min_notice_minutes, max_advance_days")
    .eq("business_id", session.profile.business_id)
    .single();

  return {
    supabase: session.supabase,
    user: session.user,
    profile: session.profile,
    business: business!,
    settings: settings as BookingSettings,
  };
}

export async function listServices() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("services").select("*").order("sort_order");
  return (data ?? []) as ServiceRow[];
}

export async function listHours() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("business_hours").select("*").order("day_of_week");
  return (data ?? []) as HoursRow[];
}

export async function listBlocks() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("blocked_times").select("*").order("starts_at", { ascending: false });
  return (data ?? []) as BlockRow[];
}

export async function listAppointments(startIso: string, endIso: string) {
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("appointments")
    .select(appointmentColumns)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at");
  return (data ?? []) as AppointmentRow[];
}

export async function getAppointment(id: string) {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("appointments").select(appointmentColumns).eq("id", id).maybeSingle();
  return data as AppointmentRow | null;
}

export async function listCustomers(search: string) {
  const { supabase } = await requireStaff();
  let query = supabase.from("customer_summaries").select("*").order("full_name");
  if (search) {
    const safe = search.replace(/[%_,]/g, "");
    query = query.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }
  const { data } = await query;
  return (data ?? []) as CustomerSummary[];
}

export async function getCustomer(id: string) {
  const { supabase } = await requireStaff();
  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  const { data: appointments } = await supabase
    .from("appointments")
    .select(appointmentColumns)
    .eq("customer_id", id)
    .order("starts_at", { ascending: false });
  return {
    customer,
    appointments: (appointments ?? []) as AppointmentRow[],
  };
}

export async function dashboardData(startIso: string, endIso: string, nowIso: string) {
  const { supabase, settings, business } = await requireStaff();
  const { data: today } = await supabase
    .from("appointments")
    .select(appointmentColumns)
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at");
  const { data: next } = await supabase
    .from("appointments")
    .select(appointmentColumns)
    .gte("starts_at", nowIso)
    .in("status", ["pending", "confirmed"])
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  return {
    today: (today ?? []) as AppointmentRow[],
    next: (next ?? null) as AppointmentRow | null,
    settings,
    business,
  };
}
