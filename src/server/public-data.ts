import { createPublicClient } from "@/lib/supabase/public";
import { publicConfig } from "@/lib/supabase/env";
import type { PublicAppointment, PublicContext, SlotResult } from "@/types/domain";

export async function loadPublicContext(): Promise<PublicContext | null> {
  const config = publicConfig();
  const supabase = createPublicClient();
  if (!config || !supabase) return null;
  const { data, error } = await supabase.rpc("ibs_public_context", { p_slug: config.slug });
  if (error || !data) return null;
  return data as PublicContext;
}

export async function loadSlots(serviceId: string, date: string): Promise<SlotResult> {
  const config = publicConfig();
  const supabase = createPublicClient();
  if (!config || !supabase) return { slots: [], reason: "unavailable" };
  const { data, error } = await supabase.rpc("ibs_public_slots", {
    p_slug: config.slug,
    p_service_id: serviceId,
    p_date: date,
  });
  if (error || !data) return { slots: [], reason: "unavailable" };
  return data as SlotResult;
}

export async function loadTokenSlots(token: string, date: string): Promise<SlotResult> {
  const supabase = createPublicClient();
  if (!supabase) return { slots: [], reason: "unavailable" };
  const { data, error } = await supabase.rpc("ibs_token_slots", { p_token: token, p_date: date });
  if (error || !data) return { slots: [], reason: "unavailable" };
  return data as SlotResult;
}

export async function loadAppointment(token: string): Promise<PublicAppointment | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("ibs_get_appointment", { p_token: token });
  if (error || !data || data.ok !== true) return null;
  return data.appointment as PublicAppointment;
}
