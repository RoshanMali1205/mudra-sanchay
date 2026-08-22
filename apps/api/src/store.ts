import { randomUUID } from "node:crypto";
import type {
  Business,
  CrateEntry,
  DashboardSummary,
  Expense,
  Farmer,
  FarmerSummary,
  Language,
  LedgerLine,
  Payment,
  Route,
  SessionUser,
  Trip,
  Vehicle
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
  businesses: Business[];
  members: Array<{ userId: string; businessId: string; role: "admin" }>;
  vehicles: Vehicle[];
  routes: Route[];
  farmers: Farmer[];
  trips: Trip[];
  payments: Payment[];
  expenses: Expense[];
  ownerCreated: boolean;
};

export const store: Store = {
  users: [],
  sessions: new Map(),
  businesses: [],
  members: [],
  vehicles: [],
  routes: [],
  farmers: [],
  trips: [],
  payments: [],
  expenses: [],
  ownerCreated: false
};

export function createId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayKolkata(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
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

export function farmerSummary(farmer: Farmer): FarmerSummary {
  const freightPaise = store.trips
    .filter((trip) => trip.status !== "cancelled")
    .flatMap((trip) => trip.entries)
    .filter((entry) => entry.farmerId === farmer.id)
    .reduce((sum, entry) => sum + entry.freightAmountPaise, 0);
  const paidPaise = store.payments
    .filter((payment) => payment.farmerId === farmer.id)
    .reduce((sum, payment) => sum + payment.amountPaise, 0);
  const totalCrates = store.trips
    .flatMap((trip) => trip.entries)
    .filter((entry) => entry.farmerId === farmer.id)
    .reduce((sum, entry) => sum + entry.crateCount, 0);

  return {
    ...farmer,
    totalCrates,
    freightPaise,
    paidPaise,
    outstandingPaise:
      farmer.openingBalancePaise + freightPaise - paidPaise
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

export function dashboardSummary(rangeDate = todayKolkata()): DashboardSummary {
  const trips = store.trips.filter((trip) => trip.tripDate === rangeDate);
  const crates = trips.reduce((sum, trip) => sum + trip.totalCrates, 0);
  const freightPaise = trips.reduce((sum, trip) => sum + trip.totalFreightPaise, 0);
  const receivedPaise = store.payments
    .filter((payment) => payment.paymentDate === rangeDate)
    .reduce((sum, payment) => sum + payment.amountPaise, 0);
  const expensesPaise = store.expenses
    .filter((expense) => expense.expenseDate === rangeDate)
    .reduce((sum, expense) => sum + expense.amountPaise, 0);
  const outstandingPaise = store.farmers
    .map(farmerSummary)
    .reduce((sum, farmer) => sum + Math.max(farmer.outstandingPaise, 0), 0);

  return {
    rangeLabel: "today",
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

export function farmerLedger(farmerId: string): LedgerLine[] {
  const farmer = store.farmers.find((item) => item.id === farmerId);
  if (!farmer) return [];

  const lines: Array<Omit<LedgerLine, "runningBalancePaise">> = [];

  for (const trip of store.trips) {
    for (const entry of trip.entries.filter((item) => item.farmerId === farmerId)) {
      lines.push({
        id: entry.id,
        date: trip.tripDate,
        type: "freight",
        description: `Trip ${trip.tripNumber} · ${entry.crateCount} crates`,
        crates: entry.crateCount,
        debitPaise: entry.freightAmountPaise,
        creditPaise: 0
      });
    }
  }

  for (const payment of store.payments.filter((item) => item.farmerId === farmerId)) {
    lines.push({
      id: payment.id,
      date: payment.paymentDate,
      type: "payment",
      description: `Payment · ${payment.mode}`,
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
