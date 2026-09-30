import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_CODE } from "@mudra-sanchay/shared";

export function isSupabaseEnabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let admin: SupabaseClient | null = null;
let serviceRoleChecked = false;

/** Decode a Supabase API JWT payload without verifying the signature (server-side config check only). */
export function readSupabaseKeyRole(apiKey: string | undefined): string | null {
  if (!apiKey) return null;
  const parts = apiKey.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1]!, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function assertServiceRoleConfigured() {
  if (serviceRoleChecked) return;
  serviceRoleChecked = true;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const role = readSupabaseKeyRole(key);
  if (role && role !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY has role "${role}". In a shared Supabase project you must use the service_role secret (Project Settings → API), not the anon/publishable key. Mudra membership writes are blocked by RLS without it.`
    );
  }
}

function createServiceClient() {
  assertServiceRoleConfigured();
  const url = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Pin Authorization so a leftover user session can never override service_role RLS bypass.
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  });
}

function createPasswordAuthClient() {
  const url = process.env.SUPABASE_URL!;
  // Prefer anon for end-user sign-in; fall back to a disposable service client.
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (anonKey) {
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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
  return createPasswordAuthClient();
}

export function supabaseConfigStatus() {
  const role = readSupabaseKeyRole(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return {
    enabled: isSupabaseEnabled(),
    serviceRoleConfigured: role === "service_role",
    serviceRoleClaim: role,
    hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  };
}

export { APP_CODE };
