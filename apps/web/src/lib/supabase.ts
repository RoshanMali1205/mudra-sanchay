import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Never put a service_role key in the web app.");
  }
  return supabase;
}

export function receiptObjectPath(userId: string, farmerId: string, fileName: string) {
  const year = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric" }).format(new Date());
  return `${userId}/${year}/${farmerId}/${fileName}`;
}
