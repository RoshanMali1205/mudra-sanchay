import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_CODE } from "@mudra-sanchay/shared";

export function isSupabaseEnabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let admin: SupabaseClient | null = null;

function createServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/** Singleton service-role client. Never call signIn* on this — it would attach a user JWT and break RLS bypass. */
export function supabaseAdmin() {
  if (!isSupabaseEnabled()) return null;
  if (!admin) {
    admin = createServiceClient();
  }
  return admin;
}

/**
 * Fresh client for password sign-in / password reset flows.
 * Discard after use so the admin singleton never inherits an end-user session.
 */
export function createSupabaseAuthClient() {
  if (!isSupabaseEnabled()) return null;
  return createServiceClient();
}

export { APP_CODE };
