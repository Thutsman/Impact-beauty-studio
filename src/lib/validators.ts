import { z } from "zod";

export const detailsSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid mobile number.")
    .max(24)
    .refine((value) => value.replace(/\D/g, "").length >= 7, "Please enter a valid mobile number."),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), "Please enter a valid email address."),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer."),
});

export const serviceInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  price: z.coerce.number().min(0).max(100000),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export const settingsSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(180),
  whatsappPhone: z
    .string()
    .trim()
    .min(7, "Please enter a valid WhatsApp number.")
    .max(24)
    .refine((value) => value.replace(/\D/g, "").length >= 7, "Please enter a valid WhatsApp number."),
  timezone: z.string().trim().min(3).max(64),
  currencyCode: z.string().trim().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code."),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(180),
  minNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
});

export const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(400),
});
