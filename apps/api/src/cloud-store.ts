import type { SessionUser } from "@mudra-sanchay/shared";
import { APP_CODE, createSupabaseAuthClient, supabaseAdmin, isSupabaseEnabled } from "./supabase.js";
import { store, tripTotals, type StoredUser } from "./store.js";

function assertOk<T extends { error: { message: string } | null }>(result: T, action: string): T {
  if (result.error) throw new Error(`${action}: ${result.error.message}`);
  return result;
}

export async function hydrateFromSupabase() {
  const db = supabaseAdmin();
  if (!db) return;

  const [businesses, members, vehicles, routes, farmers, trips, entries, payments, expenses, receipts] =
    await Promise.all([
      db.from("mudra_businesses").select("*").is("deleted_at", null),
      db.from("mudra_business_members").select("*"),
      db.from("mudra_vehicles").select("*").is("deleted_at", null),
      db.from("mudra_routes").select("*").is("deleted_at", null),
      db.from("mudra_farmers").select("*").is("deleted_at", null),
      db.from("mudra_trips").select("*").is("deleted_at", null),
      db.from("mudra_crate_entries").select("*"),
      db.from("mudra_payments").select("*"),
      db.from("mudra_expenses").select("*"),
      db.from("mudra_market_receipts").select("*")
    ]);

  for (const [label, result] of [
    ["businesses", businesses],
    ["members", members],
    ["vehicles", vehicles],
    ["routes", routes],
    ["farmers", farmers],
    ["trips", trips],
    ["entries", entries],
    ["payments", payments],
    ["expenses", expenses],
    ["receipts", receipts]
  ] as const) {
    assertOk(result, `hydrate ${label}`);
  }

  store.businesses = (businesses.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    printName: row.print_name,
    ownerName: row.owner_name,
    phone: row.phone ?? undefined,
    defaultLanguage: row.default_language ?? "en",
    timezone: row.timezone ?? "Asia/Kolkata",
    currency: row.currency ?? "INR",
    defaultRatePaise: row.default_rate_paise ?? 2500
  }));

  store.members = (members.data ?? []).map((row) => ({
    userId: row.user_id,
    businessId: row.business_id,
    role: "admin" as const
  }));

  store.vehicles = (vehicles.data ?? []).map((row) => ({
    id: row.id,
    registrationNumber: row.registration_number,
    displayName: row.display_name,
    active: row.active
  }));

  store.routes = (routes.data ?? []).map((row) => ({
    id: row.id,
    originName: row.origin_name,
    destinationName: row.destination_name,
    defaultRatePaise: row.default_rate_paise ?? 2500,
    active: row.active
  }));

  store.farmers = (farmers.data ?? []).map((row) => ({
    id: row.id,
    farmerCode: row.farmer_code,
    fullName: row.full_name,
    village: row.village,
    mobile: row.mobile ?? undefined,
    openingBalancePaise: row.opening_balance_paise ?? 0,
    active: row.active,
    notes: row.notes ?? undefined,
    createdAt: row.created_at
  }));

  const entryRows = entries.data ?? [];
  store.trips = (trips.data ?? []).map((row) => {
    const tripEntries = entryRows
      .filter((entry) => entry.trip_id === row.id)
      .map((entry) => {
        const farmer = store.farmers.find((item) => item.id === entry.farmer_id);
        return {
          id: entry.id,
          tripId: entry.trip_id,
          farmerId: entry.farmer_id,
          farmerName: farmer?.fullName ?? "",
          crateCount: entry.crate_count,
          ratePaise: entry.rate_paise,
          freightAmountPaise: entry.freight_amount_paise,
          rateSource: entry.rate_source,
          notes: entry.notes ?? undefined
        };
      });
    return {
      id: row.id,
      tripDate: row.trip_date,
      tripNumber: row.trip_number,
      vehicleId: row.vehicle_id,
      routeId: row.route_id,
      status: row.status,
      notes: row.notes ?? undefined,
      entries: tripEntries,
      ...tripTotals(tripEntries)
    };
  });

  store.payments = (payments.data ?? []).map((row) => ({
    id: row.id,
    farmerId: row.farmer_id,
    farmerName: store.farmers.find((farmer) => farmer.id === row.farmer_id)?.fullName,
    paymentDate: row.payment_date,
    amountPaise: row.amount_paise,
    mode: row.mode,
    notes: row.notes ?? undefined
  }));

  store.expenses = (expenses.data ?? []).map((row) => ({
    id: row.id,
    expenseDate: row.expense_date,
    categoryCode: row.category_code,
    amountPaise: row.amount_paise,
    vendorName: row.vendor_name ?? undefined
  }));

  store.receipts = (receipts.data ?? []).map((row) => ({
    id: row.id,
    farmerId: row.farmer_id ?? undefined,
    farmerName: store.farmers.find((farmer) => farmer.id === row.farmer_id)?.fullName,
    receiptNumber: row.receipt_number ?? undefined,
    receiptDate: row.receipt_date ?? undefined,
    grossAmountPaise: row.gross_amount_paise ?? 0,
    deductionAmountPaise: 0,
    netAmountPaise: row.net_amount_paise ?? 0,
    paidAmountPaise: row.paid_amount_paise ?? 0,
    paymentStatus: row.payment_status ?? "uploaded",
    reviewStatus: "uploaded",
    fileName: row.original_storage_path ?? "receipt",
    mimeType: "image/jpeg",
    previewDataUrl: "",
    rotation: 0,
    events: []
  }));

  store.ownerCreated = store.businesses.length > 0;
}

export type StoreSlice =
  | "businesses"
  | "members"
  | "vehicles"
  | "routes"
  | "farmers"
  | "trips"
  | "entries"
  | "payments"
  | "expenses"
  | "receipts";

export type StoreSnapshot = Record<StoreSlice, string>;

/** Capture store slices so mutations only flush what actually changed. */
export function captureStoreSnapshot(): StoreSnapshot {
  return {
    businesses: JSON.stringify(store.businesses),
    members: JSON.stringify(store.members),
    vehicles: JSON.stringify(store.vehicles),
    routes: JSON.stringify(store.routes),
    farmers: JSON.stringify(store.farmers),
    trips: JSON.stringify(
      store.trips.map(({ entries: _entries, totalCrates: _c, totalFreightPaise: _f, farmerCount: _n, ...trip }) => trip)
    ),
    entries: JSON.stringify(store.trips.map((trip) => ({ tripId: trip.id, entries: trip.entries }))),
    payments: JSON.stringify(store.payments),
    expenses: JSON.stringify(store.expenses),
    receipts: JSON.stringify(store.receipts)
  };
}

export function changedStoreSlices(before: StoreSnapshot, after: StoreSnapshot = captureStoreSnapshot()): Set<StoreSlice> {
  const dirty = new Set<StoreSlice>();
  for (const key of Object.keys(before) as StoreSlice[]) {
    if (before[key] !== after[key]) dirty.add(key);
  }
  return dirty;
}

export async function flushToSupabase(dirty?: Set<StoreSlice>) {
  const db = supabaseAdmin();
  if (!db) return;
  const businessId = store.businesses[0]?.id;
  if (!businessId) return;
  // Empty dirty set = nothing changed this request; skip all writes.
  if (dirty && dirty.size === 0) return;

  const writeAll = !dirty;
  const should = (slice: StoreSlice) => writeAll || Boolean(dirty?.has(slice));

  if (should("businesses") && store.businesses.length) {
    assertOk(
      await db.from("mudra_businesses").upsert(
        store.businesses.map((item) => ({
          id: item.id,
          name: item.name,
          print_name: item.printName,
          owner_name: item.ownerName,
          phone: item.phone ?? null,
          default_language: item.defaultLanguage,
          timezone: item.timezone,
          currency: item.currency,
          default_rate_paise: item.defaultRatePaise
        }))
      ),
      "flush businesses"
    );
  }

  if (should("members") && store.members.length) {
    assertOk(
      await db.from("mudra_business_members").upsert(
        store.members.map((item) => ({
          business_id: item.businessId,
          user_id: item.userId,
          role: item.role,
          status: "active"
        })),
        { onConflict: "business_id,user_id" }
      ),
      "flush members"
    );
  }

  if (should("vehicles") && store.vehicles.length) {
    assertOk(
      await db.from("mudra_vehicles").upsert(
        store.vehicles.map((item) => ({
          id: item.id,
          business_id: businessId,
          registration_number: item.registrationNumber,
          display_name: item.displayName,
          active: item.active
        }))
      ),
      "flush vehicles"
    );
  }

  if (should("routes") && store.routes.length) {
    assertOk(
      await db.from("mudra_routes").upsert(
        store.routes.map((item) => ({
          id: item.id,
          business_id: businessId,
          origin_name: item.originName,
          destination_name: item.destinationName,
          default_rate_paise: item.defaultRatePaise,
          active: item.active
        }))
      ),
      "flush routes"
    );
  }

  if (should("farmers") && store.farmers.length) {
    assertOk(
      await db.from("mudra_farmers").upsert(
        store.farmers.map((item) => ({
          id: item.id,
          business_id: businessId,
          farmer_code: item.farmerCode,
          full_name: item.fullName,
          mobile: item.mobile ?? null,
          village: item.village,
          opening_balance_paise: item.openingBalancePaise,
          active: item.active,
          notes: item.notes ?? null
        }))
      ),
      "flush farmers"
    );
  }

  if (should("trips") && store.trips.length) {
    assertOk(
      await db.from("mudra_trips").upsert(
        store.trips.map((item) => ({
          id: item.id,
          business_id: businessId,
          trip_date: item.tripDate,
          trip_number: item.tripNumber,
          vehicle_id: item.vehicleId,
          route_id: item.routeId,
          status: item.status,
          notes: item.notes ?? null
        }))
      ),
      "flush trips"
    );
  }

  if (should("entries")) {
    assertOk(await db.from("mudra_crate_entries").delete().eq("business_id", businessId), "clear crate entries");
    if (store.trips.some((trip) => trip.entries.length)) {
      assertOk(
        await db.from("mudra_crate_entries").insert(
          store.trips.flatMap((trip) =>
            trip.entries.map((entry) => ({
              id: entry.id,
              business_id: businessId,
              trip_id: trip.id,
              farmer_id: entry.farmerId,
              crate_count: entry.crateCount,
              rate_paise: entry.ratePaise,
              freight_amount_paise: entry.freightAmountPaise,
              rate_source: entry.rateSource
            }))
          )
        ),
        "flush crate entries"
      );
    }
  }

  if (should("payments")) {
    assertOk(await db.from("mudra_payments").delete().eq("business_id", businessId), "clear payments");
    if (store.payments.length) {
      assertOk(
        await db.from("mudra_payments").insert(
          store.payments.map((item) => ({
            id: item.id,
            business_id: businessId,
            farmer_id: item.farmerId,
            payment_date: item.paymentDate,
            amount_paise: item.amountPaise,
            mode: item.mode,
            notes: item.notes ?? null
          }))
        ),
        "flush payments"
      );
    }
  }

  if (should("expenses")) {
    assertOk(await db.from("mudra_expenses").delete().eq("business_id", businessId), "clear expenses");
    if (store.expenses.length) {
      assertOk(
        await db.from("mudra_expenses").insert(
          store.expenses.map((item) => ({
            id: item.id,
            business_id: businessId,
            expense_date: item.expenseDate,
            category_code: item.categoryCode,
            amount_paise: item.amountPaise,
            vendor_name: item.vendorName ?? null
          }))
        ),
        "flush expenses"
      );
    }
  }

  if (should("receipts")) {
    assertOk(await db.from("mudra_market_receipts").delete().eq("business_id", businessId), "clear receipts");
    if (store.receipts.length) {
      assertOk(
        await db.from("mudra_market_receipts").insert(
          store.receipts.map((item) => ({
            id: item.id,
            business_id: businessId,
            farmer_id: item.farmerId ?? null,
            receipt_number: item.receiptNumber ?? null,
            receipt_date: item.receiptDate ?? null,
            gross_amount_paise: item.grossAmountPaise,
            net_amount_paise: item.netAmountPaise,
            paid_amount_paise: item.paidAmountPaise,
            payment_status: item.paymentStatus,
            original_storage_path: item.fileName
          }))
        ),
        "flush receipts"
      );
    }
  }
}

export async function ensureBusinessMembership(userId: string) {
  const db = supabaseAdmin();
  const businessId = store.businesses[0]?.id;
  if (!db || !businessId) return;
  assertOk(
    await db.from("mudra_business_members").upsert(
      {
        business_id: businessId,
        user_id: userId,
        role: "admin",
        status: "active",
        joined_at: new Date().toISOString()
      },
      { onConflict: "business_id,user_id" }
    ),
    "join business"
  );
  if (!store.members.some((member) => member.userId === userId && member.businessId === businessId)) {
    store.members.push({ userId, businessId, role: "admin" });
  }
}

export async function sessionFromToken(token: string | undefined): Promise<SessionUser | null> {
  const db = supabaseAdmin();
  if (!db || !token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: membership } = await db
    .from("app_memberships")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("app_code", APP_CODE)
    .maybeSingle();
  if (!membership) return null;

  const { data: profile } = await db.from("mudra_profiles").select("*").eq("id", data.user.id).maybeSingle();
  const { data: bizMember } = await db
    .from("mudra_business_members")
    .select("business_id, role")
    .eq("user_id", data.user.id)
    .eq("status", "active")
    .maybeSingle();

  const stored: StoredUser = {
    id: data.user.id,
    email: data.user.email ?? "",
    password: "",
    fullName: profile?.full_name ?? (data.user.user_metadata.full_name as string) ?? data.user.email ?? "User",
    preferredLanguage: profile?.preferred_language ?? "en"
  };
  if (!store.users.some((user) => user.id === stored.id)) store.users.push(stored);

  return {
    id: stored.id,
    email: stored.email,
    fullName: stored.fullName,
    preferredLanguage: stored.preferredLanguage,
    role: (bizMember?.role ?? membership.role ?? "admin") as SessionUser["role"],
    businessId: bizMember?.business_id ?? store.businesses[0]?.id ?? null,
    onboarded: Boolean(bizMember)
  };
}

export async function ensureMudraAccess(userId: string, fullName?: string) {
  const db = supabaseAdmin();
  if (!db) return;
  assertOk(
    await db.from("app_memberships").upsert(
      { user_id: userId, app_code: APP_CODE, role: "admin" },
      { onConflict: "user_id,app_code" }
    ),
    "enable mudra membership"
  );
  assertOk(
    await db.from("mudra_profiles").upsert({
      id: userId,
      full_name: fullName || "User",
      preferred_language: "en",
      status: "active"
    }),
    "save mudra profile"
  );
}

export async function registerWithSupabase(input: { email: string; password: string; fullName: string }) {
  const db = supabaseAdmin();
  const auth = createSupabaseAuthClient();
  if (!db || !auth) throw new Error("Supabase is not configured");
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName }
  });

  const alreadyExists =
    Boolean(error) &&
    (/already|exists|registered/i.test(error?.message ?? "") ||
      error?.code === "email_exists" ||
      error?.status === 422);

  if (error && !alreadyExists) throw new Error(error.message);
  if (!alreadyExists && !data.user) throw new Error("Could not create the account.");

  // Sign in on a throwaway client so the admin singleton keeps the service role (RLS bypass).
  const { data: session, error: signInError } = await auth.auth.signInWithPassword({
    email: input.email,
    password: input.password
  });
  if (signInError || !session.session || !session.user) {
    throw new Error(
      alreadyExists
        ? "This email is already registered. Sign in with the same password."
        : (signInError?.message ?? "Account created. Sign in again.")
    );
  }

  await ensureMudraAccess(session.user.id, input.fullName);
  return { token: session.session.access_token, userId: session.user.id };
}

export async function updateProfileLanguage(userId: string, preferredLanguage: "en" | "hi" | "mr") {
  const db = supabaseAdmin();
  if (!db) return;
  assertOk(
    await db.from("mudra_profiles").update({ preferred_language: preferredLanguage }).eq("id", userId),
    "update language"
  );
}

export async function loginWithSupabase(input: { email: string; password: string }) {
  const auth = createSupabaseAuthClient();
  if (!auth) throw new Error("Supabase is not configured");
  // Sign in on a throwaway client so the admin singleton keeps the service role (RLS bypass).
  const { data, error } = await auth.auth.signInWithPassword(input);
  if (error || !data.session || !data.user) throw new Error("Email or password is incorrect.");
  const fullName = (data.user.user_metadata.full_name as string | undefined) ?? data.user.email ?? "User";
  await ensureMudraAccess(data.user.id, fullName);
  await ensureBusinessMembership(data.user.id);
  const session = await sessionFromToken(data.session.access_token);
  if (!session) throw new Error("Could not open this Mudra Sanchay account. Try again.");
  return { token: data.session.access_token, user: session };
}

export { isSupabaseEnabled };
