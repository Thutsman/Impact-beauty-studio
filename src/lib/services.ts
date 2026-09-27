import type { PublicService } from "@/types/domain";

// Shown on the site whenever the studio catalog can't be reached, so the
// current menu is always visible even if Supabase is unset or unreachable.
export const menuServices: PublicService[] = [
  {
    id: "wig-installation",
    name: "Wig Installation",
    description: "Professional wig installation.",
    duration_minutes: 120,
    price_cents: 2000,
  },
  {
    id: "wig-revamp",
    name: "Wig Revamp",
    description: "Refresh and restyle an existing wig install.",
    duration_minutes: 60,
    price_cents: 1000,
  },
  {
    id: "full-glam",
    name: "Full Glam",
    description: "Full glam makeup application.",
    duration_minutes: 90,
    price_cents: 2500,
  },
  {
    id: "soft-glam",
    name: "Soft Glam",
    description: "Soft glam makeup application.",
    duration_minutes: 75,
    price_cents: 2000,
  },
  {
    id: "natural-look",
    name: "Natural Look",
    description: "Natural, everyday makeup look.",
    duration_minutes: 60,
    price_cents: 1500,
  },
];
