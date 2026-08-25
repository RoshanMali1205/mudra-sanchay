import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import {
  calculateFreightPaise,
  copyFarmersSchema,
  crateEntryCreateSchema,
  crateEntryPatchSchema,
  expenseCreateSchema,
  farmerCreateSchema,
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  paymentCorrectSchema,
  paymentCreateSchema,
  PRINT_BRAND,
  receiptCreateSchema,
  receiptPaymentEventSchema,
  receiptUpdateSchema,
  registerSchema,
  resolveFreightRate,
  tripCreateSchema,
  tripReopenSchema
} from "@mudra-sanchay/shared";
import {
  addReceiptEvent,
  audit,
  createId,
  dailySheet,
  dashboardSummary,
  farmerLedger,
  farmerSummary,
  getUserByToken,
  nextFarmerCode,
  nowIso,
  persistStore,
  store,
  syncReceiptStatus,
  toSessionUser,
  tripTotals
} from "./store.js";
import { fail } from "./http.js";
import {
  captureStoreSnapshot,
  changedStoreSlices,
  ensureBusinessMembership,
  flushToSupabase,
  hydrateFromSupabase,
  isSupabaseEnabled,
  loginWithSupabase,
  registerWithSupabase,
  sessionFromToken,
  updateProfileLanguage
} from "./cloud-store.js";
import { supabaseConfigStatus } from "./supabase.js";
import type { SessionUser } from "@mudra-sanchay/shared";

type AppEnv = {
  Variables: {
    requestId: string;
    user: SessionUser | null;
  };
};

export const app = new Hono<AppEnv>().basePath("/api/v1");

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function resolveOrigin(origin: string): string {
  if (allowedOrigins.includes(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]+--)?[a-z0-9-]+\.netlify\.app$/.test(origin)) return origin;
  return "";
}

app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? createId();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);

  if (isSupabaseEnabled() && !c.req.path.endsWith("/health")) {
    await hydrateFromSupabase();
  }

  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (isSupabaseEnabled()) {
    c.set("user", await sessionFromToken(token));
  } else {
    const stored = getUserByToken(token);
    c.set("user", stored ? toSessionUser(stored) : null);
  }

  const before = isSupabaseEnabled() ? captureStoreSnapshot() : null;
  await next();

  const mutating = ["POST", "PATCH", "PUT", "DELETE"].includes(c.req.method);
  const ok = c.res.status >= 200 && c.res.status < 300;
  if (isSupabaseEnabled()) {
    if (mutating && ok && !c.req.path.endsWith("/health") && before) {
      await flushToSupabase(changedStoreSlices(before));
    }
  } else if (mutating && ok) {
    persistStore();
  }
});

app.use(
  "*",
  cors({
    origin: resolveOrigin,
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "x-request-id"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
  })
);

function requireUser(c: Context<AppEnv>) {
  return c.get("user");
}

app.get("/health", (c) => {
  const supabase = supabaseConfigStatus();
  return c.json({
    data: {
      ok: true,
      mode: supabase.enabled ? "supabase" : "local-demo",
      supabase,
      time: nowIso()
    }
  });
});

app.post("/auth/register", async (c) => {
  const parsed = registerSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  if (isSupabaseEnabled()) {
    try {
      const created = await registerWithSupabase(parsed.data);
      await ensureBusinessMembership(created.userId);
      const user = await sessionFromToken(created.token);
      if (!user) return fail(c, 500, "UNEXPECTED", "Account created. Sign in again.");
      return c.json({ data: { token: created.token, user } }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create the account.";
      return fail(c, 409, "EMAIL_IN_USE", message);
    }
  }

  if (store.users.some((user) => user.email === parsed.data.email.toLowerCase())) {
    return fail(c, 409, "EMAIL_IN_USE", "Could not create the account with those details.");
  }
  if (store.ownerCreated) {
    return fail(c, 403, "REGISTRATION_CLOSED", "Owner registration is closed. Ask an admin for an invite.");
  }

  const user = {
    id: createId(),
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    fullName: parsed.data.fullName,
    preferredLanguage: "en" as const
  };
  store.users.push(user);
  const token = createId();
  store.sessions.set(token, user.id);
  return c.json({ data: { token, user: toSessionUser(user) } }, 201);
});

app.post("/auth/login", async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Enter a valid email and password.");
  }

  if (isSupabaseEnabled()) {
    try {
      return c.json({ data: await loginWithSupabase(parsed.data) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email or password is incorrect.";
      return fail(c, 401, "INVALID_CREDENTIALS", message);
    }
  }

  const user = store.users.find(
    (item) =>
      item.email === parsed.data.email.toLowerCase() && item.password === parsed.data.password
  );
  if (!user) {
    return fail(c, 401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  const token = createId();
  store.sessions.set(token, user.id);
  return c.json({ data: { token, user: toSessionUser(user) } });
});

app.post("/auth/logout", (c) => {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) store.sessions.delete(token);
  return c.json({ data: { ok: true } });
});

app.post("/auth/forgot-password", async (c) => {
  const parsed = forgotPasswordSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Enter a valid email.");
  }
  if (isSupabaseEnabled()) {
    const { supabaseAdmin } = await import("./supabase.js");
    await supabaseAdmin()?.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
      redirectTo: `${process.env.APP_BASE_URL ?? "http://localhost:5173"}/auth/forgot-password`
    });
  } else {
    const token = createId();
    store.resetTokens.set(token, {
      email: parsed.data.email.toLowerCase(),
      expiresAt: Date.now() + 30 * 60 * 1000
    });
  }
  return c.json({
    data: {
      ok: true,
      message: "If that email exists, a time-limited recovery link was sent."
    }
  });
});

app.patch("/me/preferences", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const body = (await c.req.json()) as { preferredLanguage?: "en" | "hi" | "mr" };
  const stored = store.users.find((item) => item.id === user.id);
  if (stored && body.preferredLanguage) stored.preferredLanguage = body.preferredLanguage;
  if (isSupabaseEnabled() && body.preferredLanguage) {
    await updateProfileLanguage(user.id, body.preferredLanguage);
  }
  return c.json({ data: { user: stored ? toSessionUser(stored) : user } });
});

app.get("/me", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const business = store.businesses.find((item) => item.id === user.businessId) ?? null;
  return c.json({ data: { user, business } });
});

app.post("/auth/bootstrap", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  if (user.onboarded) return fail(c, 409, "ALREADY_ONBOARDED", "Business profile already exists.");

  if (isSupabaseEnabled() && store.businesses[0]) {
    await ensureBusinessMembership(user.id);
    const stored = store.users.find((item) => item.id === user.id);
    return c.json({ data: { user: stored ? toSessionUser(stored) : { ...user, onboarded: true, businessId: store.businesses[0].id, role: "admin" as const }, business: store.businesses[0] } }, 201);
  }

  const parsed = onboardingSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  }

  const businessId = createId();
  store.businesses.push({
    id: businessId,
    name: parsed.data.businessName,
    printName: parsed.data.printName || PRINT_BRAND,
    ownerName: parsed.data.ownerName,
    phone: parsed.data.phone,
    defaultLanguage: parsed.data.defaultLanguage,
    timezone: "Asia/Kolkata",
    currency: "INR",
    defaultRatePaise: parsed.data.defaultRatePaise
  });
  store.members.push({ userId: user.id, businessId, role: "admin" });
  store.vehicles.push({
    id: createId(),
    registrationNumber: parsed.data.vehicleRegistration,
    displayName: parsed.data.vehicleDisplayName,
    active: true
  });
  store.routes.push({
    id: createId(),
    originName: parsed.data.originName,
    destinationName: parsed.data.destinationName,
    defaultRatePaise: parsed.data.defaultRatePaise,
    active: true
  });
  store.ownerCreated = true;
  audit(user.fullName, "bootstrap", "business", businessId, undefined, { name: parsed.data.businessName });

  const stored = store.users.find((item) => item.id === user.id)!;
  return c.json({ data: { user: toSessionUser(stored), business: store.businesses[0] } }, 201);
});

app.get("/farmers", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const q = (c.req.query("q") ?? "").trim().toLowerCase();
  const includeArchived = c.req.query("archived") === "true";
  const farmers = store.farmers
    .filter((farmer) => includeArchived || farmer.active)
    .filter((farmer) => {
      if (!q) return true;
      return [farmer.fullName, farmer.village, farmer.mobile, farmer.farmerCode]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    })
    .map((farmer) => farmerSummary(farmer));
  return c.json({ data: farmers, meta: { count: farmers.length } });
});

app.post("/farmers", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const parsed = farmerCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Name and village are required.", parsed.error.flatten().fieldErrors);
  }

  const duplicate = store.farmers.find(
    (item) =>
      item.fullName.toLowerCase() === parsed.data.fullName.toLowerCase() ||
      (parsed.data.mobile && item.mobile === parsed.data.mobile)
  );

  if (duplicate && c.req.header("x-confirm-duplicate") !== "true") {
    return fail(
      c,
      409,
      "POSSIBLE_DUPLICATE",
      "A farmer with this name or mobile already exists. Confirm to save anyway."
    );
  }

  const farmer = {
    id: createId(),
    farmerCode: nextFarmerCode(),
    fullName: parsed.data.fullName,
    village: parsed.data.village,
    mobile: parsed.data.mobile || undefined,
    alternateMobile: parsed.data.alternateMobile,
    address: parsed.data.address,
    preferredLanguage: parsed.data.preferredLanguage,
    openingBalancePaise: parsed.data.openingBalancePaise ?? 0,
    active: true,
    notes: parsed.data.notes,
    createdAt: nowIso()
  };
  store.farmers.push(farmer);
  audit(user.fullName, "create", "farmer", farmer.id, undefined, { fullName: farmer.fullName });
  return c.json({ data: farmerSummary(farmer) }, 201);
});

app.get("/farmers/:id", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const farmer = store.farmers.find((item) => item.id === c.req.param("id"));
  if (!farmer) return fail(c, 404, "NOT_FOUND", "Farmer was not found.");
  const from = c.req.query("from");
  const to = c.req.query("to");
  return c.json({
    data: {
      farmer: farmerSummary(farmer, from, to),
      ledger: farmerLedger(farmer.id, from, to)
    }
  });
});

app.patch("/farmers/:id", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const farmer = store.farmers.find((item) => item.id === c.req.param("id"));
  if (!farmer) return fail(c, 404, "NOT_FOUND", "Farmer was not found.");
  const parsed = farmerCreateSchema.partial().safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "VALIDATION", "Check the highlighted fields.");
  const before = { ...farmer };
  Object.assign(farmer, parsed.data);
  audit(user.fullName, "update", "farmer", farmer.id, before, farmer);
  return c.json({ data: farmerSummary(farmer) });
});

app.delete("/farmers/:id", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const farmer = store.farmers.find((item) => item.id === c.req.param("id"));
  if (!farmer) return fail(c, 404, "NOT_FOUND", "Farmer was not found.");
  farmer.active = false;
  audit(user.fullName, "archive", "farmer", farmer.id, { active: true }, { active: false });
  return c.json({ data: farmerSummary(farmer) });
});

app.post("/farmers/:id/restore", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const farmer = store.farmers.find((item) => item.id === c.req.param("id"));
  if (!farmer) return fail(c, 404, "NOT_FOUND", "Farmer was not found.");
  farmer.active = true;
  audit(user.fullName, "restore", "farmer", farmer.id, { active: false }, { active: true });
  return c.json({ data: farmerSummary(farmer) });
});

app.get("/vehicles", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  return c.json({ data: store.vehicles });
});

app.get("/routes", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  return c.json({ data: store.routes });
});

app.get("/trips", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const date = c.req.query("date");
  const trips = date ? store.trips.filter((trip) => trip.tripDate === date) : store.trips;
  return c.json({ data: [...trips].sort((a, b) => b.tripDate.localeCompare(a.tripDate)) });
});

app.post("/trips", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const parsed = tripCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Date, vehicle and route are required.", parsed.error.flatten().fieldErrors);
  }
  const sameDay = store.trips.filter(
    (trip) => trip.tripDate === parsed.data.tripDate && trip.vehicleId === parsed.data.vehicleId
  );
  const tripNumber = parsed.data.tripNumber ?? (sameDay.length + 1);
  if (sameDay.some((trip) => trip.tripNumber === tripNumber)) {
    return fail(c, 409, "DUPLICATE_TRIP", "That trip number already exists for this date and vehicle.");
  }
  const trip = {
    id: createId(),
    tripDate: parsed.data.tripDate,
    tripNumber,
    vehicleId: parsed.data.vehicleId,
    routeId: parsed.data.routeId,
    status: "draft" as const,
    notes: parsed.data.notes,
    entries: [],
    totalCrates: 0,
    totalFreightPaise: 0,
    farmerCount: 0
  };
  store.trips.push(trip);
  return c.json({ data: trip }, 201);
});

app.get("/trips/:id", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const trip = store.trips.find((item) => item.id === c.req.param("id"));
  if (!trip) return fail(c, 404, "NOT_FOUND", "Trip was not found.");
  return c.json({ data: trip });
});

app.post("/trips/:id/entries", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const trip = store.trips.find((item) => item.id === c.req.param("id"));
  if (!trip) return fail(c, 404, "NOT_FOUND", "Trip was not found.");
  if (trip.status !== "draft") {
    return fail(c, 422, "TRIP_LOCKED", "Completed trips cannot take ordinary edits.");
  }
  const parsed = crateEntryCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Farmer and crate count are required.", parsed.error.flatten().fieldErrors);
  }
  const farmer = store.farmers.find((item) => item.id === parsed.data.farmerId);
  if (!farmer) return fail(c, 422, "FARMER_MISSING", "Choose a farmer from this business.");
  if (trip.entries.some((entry) => entry.farmerId === farmer.id)) {
    return fail(c, 409, "DUPLICATE_FARMER", "This farmer is already on the trip.");
  }
  const business = store.businesses[0];
  const route = store.routes.find((item) => item.id === trip.routeId);
  const resolved = resolveFreightRate({
    manualRatePaise: parsed.data.ratePaise,
    routeRatePaise: route?.defaultRatePaise,
    businessDefaultRatePaise: business?.defaultRatePaise
  });
  const freightAmountPaise = calculateFreightPaise(parsed.data.crateCount, resolved.ratePaise);
  const entry = {
    id: createId(),
    tripId: trip.id,
    farmerId: farmer.id,
    farmerName: farmer.fullName,
    crateCount: parsed.data.crateCount,
    ratePaise: resolved.ratePaise,
    freightAmountPaise,
    rateSource: resolved.source,
    notes: parsed.data.notes
  };
  trip.entries.push(entry);
  Object.assign(trip, tripTotals(trip.entries));
  audit(user.fullName, "create", "crate_entry", entry.id, undefined, {
    crateCount: entry.crateCount,
    freightAmountPaise
  });
  // Return the full trip so the client can update totals without a second GET.
  return c.json({ data: trip }, 201);
});

app.patch("/trips/:id/entries/:entryId", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const trip = store.trips.find((item) => item.id === c.req.param("id"));
  if (!trip) return fail(c, 404, "NOT_FOUND", "Trip was not found.");
  if (trip.status !== "draft") return fail(c, 422, "TRIP_LOCKED", "Completed trips cannot take ordinary edits.");
  const entry = trip.entries.find((item) => item.id === c.req.param("entryId"));
  if (!entry) return fail(c, 404, "NOT_FOUND", "Entry was not found.");
  const parsed = crateEntryPatchSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "VALIDATION", "Check crate count and rate.");
  const before = { ...entry };
  if (parsed.data.crateCount !== undefined) entry.crateCount = parsed.data.crateCount;
  if (parsed.data.ratePaise !== undefined) {
    entry.ratePaise = parsed.data.ratePaise;
    entry.rateSource = "manual";
  }
  entry.freightAmountPaise =
    entry.crateCount > 0 ? calculateFreightPaise(entry.crateCount, entry.ratePaise) : 0;
  Object.assign(trip, tripTotals(trip.entries));
  audit(user.fullName, "update", "crate_entry", entry.id, before, entry);
  return c.json({ data: trip });
});

app.delete("/trips/:id/entries/:entryId", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const trip = store.trips.find((item) => item.id === c.req.param("id"));
  if (!trip) return fail(c, 404, "NOT_FOUND", "Trip was not found.");
  if (trip.status !== "draft") return fail(c, 422, "TRIP_LOCKED", "Completed trips cannot take ordinary edits.");
  const entry = trip.entries.find((item) => item.id === c.req.param("entryId"));
  if (!entry) return fail(c, 404, "NOT_FOUND", "Entry was not found.");
  trip.entries = trip.entries.filter((item) => item.id !== entry.id);
  Object.assign(trip, tripTotals(trip.entries));
  audit(user.fullName, "delete", "crate_entry", entry.id, entry, undefined);
  return c.json({ data: trip });
});

app.post("/trips/:id/copy-farmers", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const trip = store.trips.find((item) => item.id === c.req.param("id"));
  if (!trip) return fail(c, 404, "NOT_FOUND", "Trip was not found.");
  if (trip.status !== "draft") return fail(c, 422, "TRIP_LOCKED", "Completed trips cannot take ordinary edits.");
  const parsed = copyFarmersSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "VALIDATION", "Select farmers from a previous trip.");
  const source = store.trips.find((item) => item.id === parsed.data.sourceTripId);
  if (!source) return fail(c, 404, "NOT_FOUND", "Source trip was not found.");
  const business = store.businesses[0];
  const route = store.routes.find((item) => item.id === trip.routeId);
  for (const farmerId of parsed.data.farmerIds) {
    if (trip.entries.some((entry) => entry.farmerId === farmerId)) continue;
    const farmer = store.farmers.find((item) => item.id === farmerId && item.active);
    if (!farmer) continue;
    const resolved = resolveFreightRate({
      routeRatePaise: route?.defaultRatePaise,
      businessDefaultRatePaise: business?.defaultRatePaise
    });
    trip.entries.push({
      id: createId(),
      tripId: trip.id,
      farmerId: farmer.id,
      farmerName: farmer.fullName,
      crateCount: 0,
      ratePaise: resolved.ratePaise,
      freightAmountPaise: 0,
      rateSource: resolved.source,
      notes: "Copied farmer — set crate count"
    });
  }
  Object.assign(trip, tripTotals(trip.entries));
  return c.json({ data: trip });
});

app.post("/trips/:id/complete", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const trip = store.trips.find((item) => item.id === c.req.param("id"));
  if (!trip) return fail(c, 404, "NOT_FOUND", "Trip was not found.");
  if (trip.entries.length === 0 || trip.entries.some((entry) => entry.crateCount <= 0)) {
    return fail(c, 422, "EMPTY_TRIP", "Add at least one valid crate entry before completing.");
  }
  const before = { status: trip.status };
  trip.status = "completed";
  audit(user.fullName, "complete", "trip", trip.id, before, { status: "completed", totalFreightPaise: trip.totalFreightPaise });
  return c.json({ data: trip });
});

app.post("/trips/:id/reopen", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  if (user.role !== "admin") return fail(c, 403, "FORBIDDEN", "Only an admin can reopen a trip.");
  const parsed = tripReopenSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "VALIDATION", "A reason is required to reopen.");
  const trip = store.trips.find((item) => item.id === c.req.param("id"));
  if (!trip) return fail(c, 404, "NOT_FOUND", "Trip was not found.");
  trip.status = "draft";
  trip.notes = `${trip.notes ?? ""}\nReopened: ${parsed.data.reason}`.trim();
  audit(user.fullName, "reopen", "trip", trip.id, { status: "completed" }, { status: "draft", reason: parsed.data.reason });
  return c.json({ data: trip });
});

app.get("/payments", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const farmerId = c.req.query("farmerId");
  const rows = store.payments
    .filter((payment) => !farmerId || payment.farmerId === farmerId)
    .map((payment) => ({
      ...payment,
      farmerName: store.farmers.find((farmer) => farmer.id === payment.farmerId)?.fullName
    }));
  return c.json({ data: rows });
});

app.post("/payments", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const body = await c.req.json();
  const parsed = paymentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Farmer, date, amount and mode are required.", parsed.error.flatten().fieldErrors);
  }
  const idempotencyKey = c.req.header("idempotency-key") ?? parsed.data.idempotencyKey;
  if (idempotencyKey && store.payments.some((payment) => payment.id === idempotencyKey)) {
    const existing = store.payments.find((payment) => payment.id === idempotencyKey)!;
    return c.json({ data: existing });
  }
  const farmer = store.farmers.find((item) => item.id === parsed.data.farmerId);
  if (!farmer) return fail(c, 422, "FARMER_MISSING", "Choose a farmer from this business.");
  const summary = farmerSummary(farmer);
  if (parsed.data.amountPaise > Math.max(summary.outstandingPaise, 0) && body.confirmAdvance !== true) {
    return fail(c, 422, "ADVANCE_CONFIRM", "This payment is greater than the current balance. Confirm to record it as advance/credit.");
  }
  const payment = {
    id: idempotencyKey ?? createId(),
    farmerId: parsed.data.farmerId,
    farmerName: farmer.fullName,
    paymentDate: parsed.data.paymentDate,
    amountPaise: parsed.data.amountPaise,
    mode: parsed.data.mode,
    referenceNumber: parsed.data.referenceNumber,
    notes: parsed.data.notes
  };
  store.payments.push(payment);
  audit(user.fullName, "create", "payment", payment.id, undefined, payment);
  return c.json({ data: { ...payment, outstandingPaise: farmerSummary(farmer).outstandingPaise } }, 201);
});

app.patch("/payments/:id", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const payment = store.payments.find((item) => item.id === c.req.param("id"));
  if (!payment) return fail(c, 404, "NOT_FOUND", "Payment was not found.");
  const parsed = paymentCorrectSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "VALIDATION", "Amount and a reason are required.");
  const before = { amountPaise: payment.amountPaise };
  payment.amountPaise = parsed.data.amountPaise;
  payment.correctionReason = parsed.data.reason;
  audit(user.fullName, "correct", "payment", payment.id, before, {
    amountPaise: payment.amountPaise,
    reason: parsed.data.reason
  });
  return c.json({ data: payment });
});

app.get("/expenses", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const category = c.req.query("category");
  const vehicleId = c.req.query("vehicleId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const rows = store.expenses.filter((expense) => {
    if (category && expense.categoryCode !== category) return false;
    if (vehicleId && expense.vehicleId !== vehicleId) return false;
    if (from && to && (expense.expenseDate < from || expense.expenseDate > to)) return false;
    return true;
  });
  const totals = rows.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.categoryCode] = (acc[expense.categoryCode] ?? 0) + expense.amountPaise;
    return acc;
  }, {});
  return c.json({ data: rows, meta: { totals, totalPaise: rows.reduce((sum, item) => sum + item.amountPaise, 0) } });
});

app.post("/expenses", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const parsed = expenseCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Date, category and a positive amount are required.", parsed.error.flatten().fieldErrors);
  }
  const expense = {
    id: createId(),
    expenseDate: parsed.data.expenseDate,
    categoryCode: parsed.data.categoryCode,
    amountPaise: parsed.data.amountPaise,
    vendorName: parsed.data.vendorName,
    vehicleId: parsed.data.vehicleId,
    tripId: parsed.data.tripId,
    paymentMode: parsed.data.paymentMode,
    notes: parsed.data.notes
  };
  store.expenses.push(expense);
  audit(user.fullName, "create", "expense", expense.id, undefined, expense);
  return c.json({ data: expense }, 201);
});

app.get("/receipts", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  return c.json({ data: store.receipts });
});

app.post("/receipts", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const parsed = receiptCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "VALIDATION", "Upload a JPEG, PNG or PDF receipt.");
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowed.includes(parsed.data.mimeType)) {
    return fail(c, 400, "FILE_TYPE", "Only JPEG, PNG or PDF files are allowed.");
  }
  const farmer = store.farmers.find((item) => item.id === parsed.data.farmerId);
  const receipt = {
    id: createId(),
    farmerId: parsed.data.farmerId,
    farmerName: farmer?.fullName,
    tripId: parsed.data.tripId,
    receiptNumber: parsed.data.receiptNumber,
    receiptDate: parsed.data.receiptDate,
    dueDate: parsed.data.dueDate,
    grossAmountPaise: parsed.data.grossAmountPaise ?? 0,
    deductionAmountPaise: parsed.data.deductionAmountPaise ?? 0,
    netAmountPaise: parsed.data.netAmountPaise ?? 0,
    paidAmountPaise: 0,
    paymentStatus: "uploaded" as const,
    reviewStatus: "uploaded" as const,
    fileName: parsed.data.fileName,
    mimeType: parsed.data.mimeType,
    previewDataUrl: parsed.data.previewDataUrl,
    rotation: 0,
    notes: parsed.data.notes,
    events: []
  };
  syncReceiptStatus(receipt);
  store.receipts.push(receipt);
  audit(user.fullName, "create", "receipt", receipt.id, undefined, { fileName: receipt.fileName });
  return c.json({ data: receipt }, 201);
});

app.get("/receipts/:id", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const receipt = store.receipts.find((item) => item.id === c.req.param("id"));
  if (!receipt) return fail(c, 404, "NOT_FOUND", "Receipt was not found.");
  return c.json({ data: receipt });
});

app.patch("/receipts/:id", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const receipt = store.receipts.find((item) => item.id === c.req.param("id"));
  if (!receipt) return fail(c, 404, "NOT_FOUND", "Receipt was not found.");
  const parsed = receiptUpdateSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "VALIDATION", "Check receipt details.");
  Object.assign(receipt, parsed.data);
  if (parsed.data.farmerId) {
    receipt.farmerName = store.farmers.find((item) => item.id === parsed.data.farmerId)?.fullName;
  }
  syncReceiptStatus(receipt);
  return c.json({ data: receipt });
});

app.post("/receipts/:id/payment-events", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const receipt = store.receipts.find((item) => item.id === c.req.param("id"));
  if (!receipt) return fail(c, 404, "NOT_FOUND", "Receipt was not found.");
  const parsed = receiptPaymentEventSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 400, "VALIDATION", "Date, amount and mode are required.");
  const nextPaid = receipt.paidAmountPaise + parsed.data.amountPaise;
  if (receipt.netAmountPaise > 0 && nextPaid > receipt.netAmountPaise && !parsed.data.confirmOverpay) {
    return fail(c, 422, "OVERPAY_CONFIRM", "This would overpay the receipt. Confirm and add a note.");
  }
  addReceiptEvent(receipt, parsed.data);
  return c.json({ data: receipt }, 201);
});

app.get("/dashboard/summary", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  return c.json({
    data: dashboardSummary(c.req.query("preset") ?? "today", c.req.query("from"), c.req.query("to"))
  });
});

app.get("/reports/daily-sheet", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  return c.json({
    data: dailySheet(c.req.query("preset") ?? "today", c.req.query("from"), c.req.query("to"))
  });
});

app.get("/reports/outstanding", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  return c.json({
    data: store.farmers
      .filter((farmer) => farmer.active)
      .map((farmer) => farmerSummary(farmer))
      .sort((a, b) => b.outstandingPaise - a.outstandingPaise)
  });
});

app.get("/audit", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  if (user.role !== "admin") return fail(c, 403, "FORBIDDEN", "Only an admin can view the audit trail.");
  return c.json({ data: store.auditLogs });
});

app.notFound((c) => fail(c, 404, "NOT_FOUND", "This endpoint does not exist."));

app.onError((error, c) => {
  console.error(error);
  return fail(c, 500, "UNEXPECTED", "Something went wrong. Try again.");
});

export default app;
