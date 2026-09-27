"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "@/lib/supabase/env";

export function createBrowserSupabase() {
  const config = publicConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.key);
}
