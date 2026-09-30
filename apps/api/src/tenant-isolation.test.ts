import { beforeEach, describe, expect, it } from "vitest";
import { businessWriteSet } from "./cloud-store.js";
import app from "./app.js";
import { belongsToBusiness, createId, nowIso, resetStore, store, withStoreLock } from "./store.js";

process.env.MUDRA_SKIP_PERSIST = "1";
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

type Json = { data?: unknown; error?: { code?: string } };

async function request(path: string, token: string | null, body?: unknown, method = body ? "POST" : "GET") {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await app.request(`/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = (await response.json()) as Json;
  return { status: response.status, payload };
}

async function openAccount(name: string, email: string) {
  const registered = await request("/auth/register", null, {
    fullName: name,
    email,
    password: "password1"
  });
  expect(registered.status).toBe(201);
  const token = (registered.payload.data as { token: string }).token;
  const onboarded = await request("/auth/bootstrap", token, {
    businessName: `${name} Transport`,
    printName: `${name} Transport`,
    ownerName: name,
    defaultLanguage: "en",
    defaultRatePaise: 2500,
    vehicleRegistration: `MH15${name.slice(0, 2).toUpperCase()}1234`,
    vehicleDisplayName: `${name} Truck`,
    originName: "Ugaon",
    destinationName: "Pimpalgaon Baswant"
  });
  expect(onboarded.status).toBe(201);
  const business = (onboarded.payload.data as { business: { id: string } }).business;
  return { token, businessId: business.id };
}

describe("separate users keep separate records", () => {
  beforeEach(() => {
    resetStore();
  });

  it("does not treat a row without a business id as shared", () => {
    expect(belongsToBusiness({ businessId: "a" }, "a")).toBe(true);
    expect(belongsToBusiness({ businessId: "a" }, "b")).toBe(false);
    expect(belongsToBusiness({}, "a")).toBe(false);
    expect(belongsToBusiness({ businessId: "a" }, null)).toBe(false);
  });

  it("saves each login's farmers, trips, payments, expenses and audit on that business only", async () => {
    const userA = await openAccount("Anita", "anita@example.com");
    const userB = await openAccount("Bharat", "bharat@example.com");

    const farmerA = await request("/farmers", userA.token, {
      fullName: "Ramesh Patil",
      village: "Ugaon",
      openingBalancePaise: 5000
    });
    const farmerB = await request("/farmers", userB.token, {
      fullName: "Suresh Kale",
      village: "Pimpalgaon",
      openingBalancePaise: 0
    });
    expect(farmerA.status).toBe(201);
    expect(farmerB.status).toBe(201);
    const farmerAId = (farmerA.payload.data as { id: string; farmerCode: string }).id;
    const farmerBId = (farmerB.payload.data as { id: string; farmerCode: string }).id;
    expect((farmerA.payload.data as { farmerCode: string }).farmerCode).toBe("FRM-0001");
    expect((farmerB.payload.data as { farmerCode: string }).farmerCode).toBe("FRM-0001");

    store.farmers.push({
      id: createId(),
      fullName: "Unassigned Farmer",
      farmerCode: "FRM-9999",
      village: "Nowhere",
      openingBalancePaise: 0,
      active: true,
      createdAt: nowIso()
    });

    const listA = await request("/farmers", userA.token);
    const listB = await request("/farmers", userB.token);
    const names = (payload: Json) => ((payload.data as Array<{ fullName: string }>) ?? []).map((item) => item.fullName);
    expect(names(listA.payload)).toEqual(["Ramesh Patil"]);
    expect(names(listB.payload)).toEqual(["Suresh Kale"]);

    expect((await request(`/farmers/${farmerAId}`, userB.token)).status).toBe(404);
    expect((await request(`/farmers/${farmerBId}`, userA.token)).status).toBe(404);

    const vehiclesA = await request("/vehicles", userA.token);
    const routesA = await request("/routes", userA.token);
    const vehicleId = (vehiclesA.payload.data as Array<{ id: string }>)[0]!.id;
    const routeId = (routesA.payload.data as Array<{ id: string }>)[0]!.id;
    const trip = await request("/trips", userA.token, {
      tripDate: "2026-09-23",
      vehicleId,
      routeId
    });
    expect(trip.status).toBe(201);
    const tripId = (trip.payload.data as { id: string }).id;
    const entry = await request(`/trips/${tripId}/entries`, userA.token, {
      farmerId: farmerAId,
      crateType: "golti",
      crateCount: 10
    });
    expect(entry.status).toBe(201);
    expect((await request(`/trips/${tripId}`, userB.token)).status).toBe(404);

    const payment = await request("/payments", userA.token, {
      farmerId: farmerAId,
      paymentDate: "2026-09-23",
      amountPaise: 1000,
      mode: "cash",
      confirmAdvance: true
    });
    expect(payment.status).toBe(201);
    const paymentId = (payment.payload.data as { id: string }).id;
    expect((await request(`/payments/${paymentId}`, userB.token, { amountPaise: 50, reason: "wrong account" }, "PATCH")).status).toBe(404);
    expect((await request("/payments", userB.token)).payload.data as unknown[]).toHaveLength(0);

    const expense = await request("/expenses", userA.token, {
      expenseDate: "2026-09-23",
      categoryCode: "diesel",
      amountPaise: 25000
    });
    expect(expense.status).toBe(201);
    expect((await request("/expenses", userB.token)).payload.data as unknown[]).toHaveLength(0);

    const dashA = await request("/dashboard/summary?preset=year", userA.token);
    const dashB = await request("/dashboard/summary?preset=year", userB.token);
    expect((dashA.payload.data as { crates: number; freightPaise: number }).crates).toBe(10);
    expect((dashA.payload.data as { freightPaise: number }).freightPaise).toBe(25000);
    expect((dashB.payload.data as { crates: number; freightPaise: number; expensesPaise: number }).crates).toBe(0);
    expect((dashB.payload.data as { freightPaise: number }).freightPaise).toBe(0);
    expect((dashB.payload.data as { expensesPaise: number }).expensesPaise).toBe(0);

    const auditA = await request("/audit", userA.token);
    const auditB = await request("/audit", userB.token);
    const actions = (payload: Json) =>
      ((payload.data as Array<{ action: string; entityId: string; businessId?: string }>) ?? []).map(
        (item) => `${item.businessId}:${item.action}:${item.entityId}`
      );
    expect(actions(auditA.payload).every((item) => item.startsWith(`${userA.businessId}:`))).toBe(true);
    expect(actions(auditB.payload).every((item) => item.startsWith(`${userB.businessId}:`))).toBe(true);
    expect(actions(auditA.payload).some((item) => item.includes(farmerAId))).toBe(true);
    expect(actions(auditB.payload).some((item) => item.includes(farmerAId))).toBe(false);
    expect(actions(auditB.payload).some((item) => item.includes(farmerBId))).toBe(true);

    const meA = await request("/me", userA.token);
    const meB = await request("/me", userB.token);
    expect((meA.payload.data as { business: { name: string } }).business.name).toBe("Anita Transport");
    expect((meB.payload.data as { business: { name: string } }).business.name).toBe("Bharat Transport");
  });

  it("only prepares database writes for the business that owns the change", () => {
    store.businesses.push(
      {
        id: "biz-a",
        name: "A",
        printName: "A",
        ownerName: "A",
        defaultLanguage: "en",
        timezone: "Asia/Kolkata",
        currency: "INR",
        defaultRatePaise: 2500
      },
      {
        id: "biz-b",
        name: "B",
        printName: "B",
        ownerName: "B",
        defaultLanguage: "en",
        timezone: "Asia/Kolkata",
        currency: "INR",
        defaultRatePaise: 2500
      }
    );
    store.farmers.push(
      {
        id: "farmer-a",
        businessId: "biz-a",
        farmerCode: "FRM-0001",
        fullName: "A Farmer",
        village: "Ugaon",
        openingBalancePaise: 0,
        active: true,
        createdAt: nowIso()
      },
      {
        id: "farmer-b",
        businessId: "biz-b",
        farmerCode: "FRM-0001",
        fullName: "B Farmer",
        village: "Ugaon",
        openingBalancePaise: 0,
        active: true,
        createdAt: nowIso()
      }
    );
    const writes = businessWriteSet("biz-a");
    expect(writes.businesses.map((item) => item.id)).toEqual(["biz-a"]);
    expect(writes.farmers.map((item) => item.id)).toEqual(["farmer-a"]);
  });

  it("runs one login's save to completion before another login can use the store", async () => {
    const order: string[] = [];
    const first = withStoreLock(async () => {
      order.push("first-start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("first-end");
    });
    const second = withStoreLock(async () => {
      order.push("second-start");
      order.push("second-end");
    });
    await Promise.all([first, second]);
    expect(order).toEqual(["first-start", "first-end", "second-start", "second-end"]);
  });
});
