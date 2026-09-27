export type PublicService = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
};

export type BookingSettings = {
  timezone: string;
  currency_code: string;
  slot_interval_minutes: number;
  min_notice_minutes: number;
  max_advance_days: number;
};

export type PublicBusiness = {
  name: string;
  display_name: string;
  tagline: string | null;
  slug: string;
  whatsapp_phone: string | null;
};

export type PublicContext = {
  business: PublicBusiness;
  settings: BookingSettings;
  services: PublicService[];
};

export type Slot = {
  starts_at: string;
  ends_at: string;
};

export type SlotResult = {
  slots: Slot[];
  reason: string | null;
};

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export type PublicAppointment = {
  service_name: string;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_cents: number;
  duration_minutes: number;
  customer_name: string;
  customer_email: string | null;
  notes: string | null;
  timezone: string;
  display_name: string;
  currency_code: string;
  payment_status: string;
  whatsapp_phone: string | null;
};

export type AppointmentRow = {
  id: string;
  customer_id: string;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_cents: number;
  duration_minutes: number;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  source: string;
  payment_status: string;
};

export type ServiceRow = PublicService & {
  is_active: boolean;
  sort_order: number;
};

export type HoursRow = {
  id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

export type BlockRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  label: string;
  notes: string | null;
};

export type CustomerSummary = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  appointment_count: number;
  last_appointment_at: string | null;
  upcoming_appointment_at: string | null;
};
