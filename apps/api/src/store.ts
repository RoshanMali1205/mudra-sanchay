import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inRange,
  resolveDateRange,
  type AuditLog,
  type Business,
  type CrateEntry,
  type DashboardSummary,
  type Expense,
  type Farmer,
  type FarmerSummary,
  type Language,
  type LedgerLine,
  type MarketReceipt,
  type Payment,
  type ReceiptPaymentEvent,
  type Route,
  type SessionUser,
  type Trip,
  type Vehicle
} from "@mudra-sanchay/shared";

export type StoredUser = {
  id: string;
  email: string;
  password: string;
  fullName: string;
  preferredLanguage: Language;
};

export type Store = {
  users: StoredUser[];
  sessions: Map<string, string>;
  resetTokens: Map<string, { email: string; expiresAt: number }>;
  businesses: Business[];
  members: Array<{ userId: string; businessId: string; role: "admin" }>;
  vehicles: Vehicle[];
  routes: Route[];
  farmers: Farmer[];
  trips: Trip[];
  payments: Payment[];
  expenses: Expense[];
  receipts: MarketReceipt[];
  auditLogs: AuditLog[];
  ownerCreated: boolean;
};

export const store: Store = {
  users: [],
  sessions: new Map(),
  resetTokens: new Map(),
  businesses: [],
  members: [],
  vehicles: [],
  routes: [],
  farmers: [],
  trips: [],
  payments: [],
  expenses: [],
  receipts: [],
  auditLogs: [],
  ownerCreated: false
};

const dataFile = join(dirname(fileURLToPath(import.meta.url)), "..", ".data", "local-store.json");

type PersistedStore = Omit<Store, "sessions" | "resetTokens"> & {
  sessions: Array<[string, string]>;
  resetTokens: Array<[string, { email: string; expiresAt: number }]>;
};

export function loadStore(): void {
  try {
    if (!existsSync(dataFile)) return;
    const raw = JSON.parse(readFileSync(dataFile, "utf8")) as PersistedStore;
    store.users = raw.users ?? [];
    store.sessions = new Map(raw.sessions ?? []);
    store.resetTokens = new Map(raw.resetTokens ?? []);
    store.businesses = raw.businesses ?? [];
    store.members = raw.members ?? [];
    store.vehicles = raw.vehicles ?? [];
    store.routes = raw.routes ?? [];
    store.farmers = raw.farmers ?? [];
    store.trips = raw.trips ?? [];
    store.payments = raw.payments ?? [];
    store.expenses = raw.expenses ?? [];
    store.receipts = raw.receipts ?? [];
    store.auditLogs = raw.auditLogs ?? [];
    store.ownerCreated = Boolean(raw.ownerCreated);
  } catch (error) {
    console.warn("Could not load local demo data", error);
  }
}

export function persistStore(): void {
  try {
    mkdirSync(dirname(dataFile), { recursive: true });
    const payload: PersistedStore = {
      ...store,
      sessions: [...store.sessions.entries()],
      resetTokens: [...store.resetTokens.entries()]
    };
    writeFileSync(dataFile, JSON.stringify(payload));
  } catch (error) {
    console.warn("Could not save local demo data", error);
  }
}

export function createId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayKolkata(): string {
  return resolveDateRange("today").to;
}

export function audit(
  actorName: string,
  action: string,
  entityType: string,
  entityId: string,
  beforeData?: Record<string, unknown>,
  afterData?: Record<string, unknown>
): void {
  store.auditLogs.unshift({
    id: createId(),
    actorName,
    action,
    entityType,
    entityId,
    beforeData,
    afterData,
    createdAt: nowIso()
  });
}

export function getUserByToken(token: string | undefined): StoredUser | undefined {
  if (!token) return undefined;
  const userId = store.sessions.get(token);
  return store.users.find((user) => user.id === userId);
}

export function toSessionUser(user: StoredUser): SessionUser {
  const membership = store.members.find((member) => member.userId === user.id);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    preferredLanguage: user.preferredLanguage,
    role: membership?.role ?? null,
    businessId: membership?.businessId ?? null,
    onboarded: Boolean(membership)
  };
}

export function nextFarmerCode(): string {
  const next = store.farmers.length + 1;
  return `FRM-${String(next).padStart(4, "0")}`;
}

export function farmerSummary(farmer: Farmer, from?: string, to?: string): FarmerSummary {
  const trips = store.trips.filter((trip) => trip.status !== "cancelled");
  const entries = trips
    .flatMap((trip) => trip.entries.map((entry) => ({ trip, entry })))
    .filter(({ trip, entry }) => {
      if (entry.farmerId !== farmer.id) return false;
      if (from && to) return inRange(trip.tripDate, from, to);
      return true;
    });
  const freightPaise = entries.reduce((sum, item) => sum + item.entry.freightAmountPaise, 0);
  const paidPaise = store.payments
    .filter((payment) => {
      if (payment.farmerId !== farmer.id) return false;
      if (from && to) return inRange(payment.paymentDate, from, to);
      return true;
    })
    .reduce((sum, payment) => sum + payment.amountPaise, 0);
  const totalCrates = entries.reduce((sum, item) => sum + item.entry.crateCount, 0);

  return {
    ...farmer,
    totalCrates,
    freightPaise,
    paidPaise,
    outstandingPaise: farmer.openingBalancePaise + freightPaise - paidPaise
  };
}

export function tripTotals(entries: CrateEntry[]): {
  totalCrates: number;
  totalFreightPaise: number;
} {
  return {
    totalCrates: entries.reduce((sum, entry) => sum + entry.crateCount, 0),
    totalFreightPaise: entries.reduce((sum, entry) => sum + entry.freightAmountPaise, 0)
  };
}

export function dashboardSummary(preset = "today", from?: string, to?: string): DashboardSummary {
  const range = resolveDateRange(preset, from, to);
  const trips = store.trips.filter((trip) => inRange(trip.tripDate, range.from, range.to));
  const crates = trips.reduce((sum, trip) => sum + trip.totalCrates, 0);
  const freightPaise = trips.reduce((sum, trip) => sum + trip.totalFreightPaise, 0);
  const receivedPaise = store.payments
    .filter((payment) => inRange(payment.paymentDate, range.from, range.to))
    .reduce((sum, payment) => sum + payment.amountPaise, 0);
  const expensesPaise = store.expenses
    .filter((expense) => inRange(expense.expenseDate, range.from, range.to))
    .reduce((sum, expense) => sum + expense.amountPaise, 0);
  const outstandingPaise = store.farmers
    .filter((farmer) => farmer.active)
    .map((farmer) => farmerSummary(farmer))
    .reduce((sum, farmer) => sum + Math.max(farmer.outstandingPaise, 0), 0);

  return {
    rangeLabel: range.label,
    from: range.from,
    to: range.to,
    crates,
    trips: trips.length,
    freightPaise,
    receivedPaise,
    expensesPaise,
    outstandingPaise,
    accrualProfitPaise: freightPaise - expensesPaise,
    cashSurplusPaise: receivedPaise - expensesPaise
  };
}

export function farmerLedger(farmerId: string, from?: string, to?: string): LedgerLine[] {
  const farmer = store.farmers.find((item) => item.id === farmerId);
  if (!farmer) return [];

  const lines: Array<Omit<LedgerLine, "runningBalancePaise">> = [];

  for (const trip of store.trips) {
    for (const entry of trip.entries.filter((item) => item.farmerId === farmerId)) {
      if (from && to && !inRange(trip.tripDate, from, to)) continue;
      const remaining = remainingOnCharge(entry.id);
      const paidLabel =
        remaining <= 0 ? "Paid" : remaining < entry.freightAmountPaise ? "Partially paid" : "Unpaid";
      lines.push({
        id: entry.id,
        date: trip.tripDate,
        type: "freight",
        description: `Trip ${trip.tripNumber} · ${entry.crateCount} crates · ${paidLabel}`,
        crates: entry.crateCount,
        debitPaise: entry.freightAmountPaise,
        creditPaise: 0
      });
    }
  }

  for (const payment of store.payments.filter((item) => item.farmerId === farmerId)) {
    if (from && to && !inRange(payment.paymentDate, from, to)) continue;
    lines.push({
      id: payment.id,
      date: payment.paymentDate,
      type: "payment",
      description: `Payment · ${payment.mode}${payment.correctionReason ? " · corrected" : ""}`,
      debitPaise: 0,
      creditPaise: payment.amountPaise
    });
  }

  lines.sort((a, b) => a.date.localeCompare(b.date));
  let running = farmer.openingBalancePaise;
  return lines.map((line) => {
    running += line.debitPaise - line.creditPaise;
    return { ...line, runningBalancePaise: running };
  });
}

function remainingOnCharge(entryId: string): number {
  const entry = store.trips.flatMap((trip) => trip.entries).find((item) => item.id === entryId);
  if (!entry) return 0;
  const paid = store.payments
    .filter((payment) => payment.farmerId === entry.farmerId)
    .reduce((sum, payment) => sum + payment.amountPaise, 0);
  const charges = store.trips
    .flatMap((trip) => trip.entries)
    .filter((item) => item.farmerId === entry.farmerId)
    .sort((a, b) => a.id.localeCompare(b.id));
  let remainingPayment = paid;
  for (const charge of charges) {
    const applied = Math.min(charge.freightAmountPaise, remainingPayment);
    remainingPayment -= applied;
    if (charge.id === entryId) return charge.freightAmountPaise - applied;
  }
  return entry.freightAmountPaise;
}

export function syncReceiptStatus(receipt: MarketReceipt): void {
  if (receipt.farmerId) {
    receipt.reviewStatus = receipt.reviewStatus === "uploaded" ? "linked" : receipt.reviewStatus;
  }
  const net = receipt.netAmountPaise;
  if (net > 0 && receipt.paidAmountPaise >= net) {
    receipt.paymentStatus = "paid";
  } else if (receipt.paidAmountPaise > 0) {
    receipt.paymentStatus = "partially_paid";
  } else if (receipt.farmerId) {
    receipt.paymentStatus = "awaiting_payment";
  } else {
    receipt.paymentStatus = "uploaded";
  }
}

export function addReceiptEvent(
  receipt: MarketReceipt,
  event: Omit<ReceiptPaymentEvent, "id" | "receiptId"> & { id?: string }
): ReceiptPaymentEvent {
  const saved: ReceiptPaymentEvent = {
    id: event.id ?? createId(),
    receiptId: receipt.id,
    eventDate: event.eventDate,
    amountPaise: event.amountPaise,
    mode: event.mode,
    referenceNumber: event.referenceNumber,
    notes: event.notes
  };
  receipt.events.push(saved);
  receipt.paidAmountPaise = receipt.events.reduce((sum, item) => sum + item.amountPaise, 0);
  syncReceiptStatus(receipt);
  return saved;
}
