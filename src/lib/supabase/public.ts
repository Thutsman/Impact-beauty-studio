import { createClient } from "@supabase/supabase-js";
import { publicConfig } from "@/lib/supabase/env";

export function createPublicClient() {
  const config = publicConfig();
  if (!config) return null;
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
