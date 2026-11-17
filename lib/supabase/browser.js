"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

let supabase;

export function createSupabaseBrowserClient() {
  if (supabase) {
    return supabase;
  }

  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  supabase = createBrowserClient(config.url, config.publishableKey);
  return supabase;
}
