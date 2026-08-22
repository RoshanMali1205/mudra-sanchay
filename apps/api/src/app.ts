import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import {
  calculateFreightPaise,
  crateEntryCreateSchema,
  farmerCreateSchema,
  loginSchema,
  onboardingSchema,
  paymentCreateSchema,
  PRINT_BRAND,
  registerSchema,
  resolveFreightRate,
  tripCreateSchema
} from "@mudra-sanchay/shared";
import {
  createId,
  dashboardSummary,
  farmerLedger,
  farmerSummary,
  getUserByToken,
  nextFarmerCode,
  nowIso,
  store,
  todayKolkata,
  toSessionUser,
  tripTotals
} from "./store.js";
import { fail } from "./http.js";

type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export const app = new Hono<AppEnv>().basePath("/api/v1");

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? createId();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
});

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "x-request-id"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
  })
);

function requireUser(c: Context<AppEnv>) {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const user = getUserByToken(token);
  if (!user) return null;
  return toSessionUser(user);
}

app.get("/health", (c) =>
  c.json({
    data: {
      ok: true,
      mode: process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local-demo",
      time: nowIso()
    }
  })
);

app.post("/auth/register", async (c) => {
  const parsed = registerSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Check the highlighted fields.", parsed.error.flatten().fieldErrors);
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

  const stored = store.users.find((item) => item.id === user.id)!;
  return c.json({ data: { user: toSessionUser(stored), business: store.businesses[0] } }, 201);
});

app.get("/farmers", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const q = (c.req.query("q") ?? "").trim().toLowerCase();
  const farmers = store.farmers
    .filter((farmer) => farmer.active)
    .filter((farmer) => {
      if (!q) return true;
      return [farmer.fullName, farmer.village, farmer.mobile, farmer.farmerCode]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    })
    .map(farmerSummary);
  return c.json({ data: farmers, meta: { count: farmers.length } });
});

app.post("/farmers", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const parsed = farmerCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Name and village are required.", parsed.error.flatten().fieldErrors);
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
  return c.json({ data: farmerSummary(farmer) }, 201);
});

app.get("/farmers/:id", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const farmer = store.farmers.find((item) => item.id === c.req.param("id"));
  if (!farmer) return fail(c, 404, "NOT_FOUND", "Farmer was not found.");
  return c.json({
    data: {
      farmer: farmerSummary(farmer),
      ledger: farmerLedger(farmer.id)
    }
  });
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
    totalFreightPaise: 0
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
  return c.json({
    data: {
      ...entry,
      freightAmountFormatted: `INR ${(freightAmountPaise / 100).toFixed(2)}`
    }
  }, 201);
});

app.post("/trips/:id/complete", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const trip = store.trips.find((item) => item.id === c.req.param("id"));
  if (!trip) return fail(c, 404, "NOT_FOUND", "Trip was not found.");
  if (trip.entries.length === 0) {
    return fail(c, 422, "EMPTY_TRIP", "Add at least one crate entry before completing.");
  }
  trip.status = "completed";
  return c.json({ data: trip });
});

app.post("/payments", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  const parsed = paymentCreateSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 400, "VALIDATION", "Farmer, date, amount and mode are required.", parsed.error.flatten().fieldErrors);
  }
  const idempotencyKey = c.req.header("idempotency-key") ?? parsed.data.idempotencyKey;
  if (idempotencyKey && store.payments.some((payment) => payment.id === idempotencyKey)) {
    const existing = store.payments.find((payment) => payment.id === idempotencyKey)!;
    return c.json({ data: existing });
  }
  const payment = {
    id: idempotencyKey ?? createId(),
    farmerId: parsed.data.farmerId,
    paymentDate: parsed.data.paymentDate,
    amountPaise: parsed.data.amountPaise,
    mode: parsed.data.mode,
    referenceNumber: parsed.data.referenceNumber,
    notes: parsed.data.notes
  };
  store.payments.push(payment);
  return c.json({ data: payment }, 201);
});

app.get("/dashboard/summary", (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHENTICATED", "Please sign in again.");
  return c.json({ data: dashboardSummary(c.req.query("date") ?? todayKolkata()) });
});

app.notFound((c) => fail(c, 404, "NOT_FOUND", "This endpoint does not exist."));

app.onError((error, c) => {
  console.error(error);
  return fail(c, 500, "UNEXPECTED", "Something went wrong. Try again.");
});

export default app;
