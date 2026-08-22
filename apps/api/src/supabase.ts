import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_CODE } from "@mudra-sanchay/shared";

export function isSupabaseEnabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let admin: SupabaseClient | null = null;

export function supabaseAdmin() {
  if (!isSupabaseEnabled()) return null;
  if (!admin) {
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return admin;
}

export { APP_CODE };
