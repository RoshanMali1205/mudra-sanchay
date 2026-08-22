import type {
  EXPENSE_CATEGORY_CODES,
  MEMBER_ROLES,
  PAYMENT_MODES,
  RATE_SOURCES,
  RECEIPT_PAYMENT_STATUSES,
  SUPPORTED_LANGUAGES,
  TRIP_STATUSES
} from "./constants.js";

export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type MemberRole = (typeof MEMBER_ROLES)[number];
export type TripStatus = (typeof TRIP_STATUSES)[number];
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export type RateSource = (typeof RATE_SOURCES)[number];
export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORY_CODES)[number];
export type ReceiptPaymentStatus = (typeof RECEIPT_PAYMENT_STATUSES)[number];

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    requestId: string;
  };
};

export type ApiSuccess<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  preferredLanguage: Language;
  role: MemberRole | null;
  businessId: string | null;
  onboarded: boolean;
};

export type Business = {
  id: string;
  name: string;
  printName: string;
  ownerName: string;
  phone?: string;
  defaultLanguage: Language;
  timezone: string;
  currency: string;
  defaultRatePaise: number;
};

export type Farmer = {
  id: string;
  farmerCode: string;
  fullName: string;
  village: string;
  mobile?: string;
  alternateMobile?: string;
  address?: string;
  preferredLanguage?: Language;
  openingBalancePaise: number;
  active: boolean;
  notes?: string;
  createdAt: string;
};

export type FarmerSummary = Farmer & {
  totalCrates: number;
  freightPaise: number;
  paidPaise: number;
  outstandingPaise: number;
};

export type Vehicle = {
  id: string;
  registrationNumber: string;
  displayName: string;
  active: boolean;
};

export type Route = {
  id: string;
  originName: string;
  destinationName: string;
  defaultRatePaise: number;
  active: boolean;
};

export type CrateEntry = {
  id: string;
  tripId: string;
  farmerId: string;
  farmerName: string;
  crateCount: number;
  ratePaise: number;
  freightAmountPaise: number;
  rateSource: RateSource;
  notes?: string;
};

export type Trip = {
  id: string;
  tripDate: string;
  tripNumber: number;
  vehicleId: string;
  routeId: string;
  status: TripStatus;
  notes?: string;
  entries: CrateEntry[];
  totalCrates: number;
  totalFreightPaise: number;
  farmerCount: number;
};

export type Payment = {
  id: string;
  farmerId: string;
  farmerName?: string;
  paymentDate: string;
  amountPaise: number;
  mode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  correctionReason?: string;
};

export type Expense = {
  id: string;
  expenseDate: string;
  categoryCode: string;
  amountPaise: number;
  vendorName?: string;
  vehicleId?: string;
  tripId?: string;
  paymentMode?: PaymentMode;
  notes?: string;
};

export type ReceiptPaymentEvent = {
  id: string;
  receiptId: string;
  eventDate: string;
  amountPaise: number;
  mode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
};

export type MarketReceipt = {
  id: string;
  farmerId?: string;
  farmerName?: string;
  tripId?: string;
  receiptNumber?: string;
  receiptDate?: string;
  dueDate?: string;
  grossAmountPaise: number;
  deductionAmountPaise: number;
  netAmountPaise: number;
  paidAmountPaise: number;
  paymentStatus: ReceiptPaymentStatus;
  reviewStatus: "needs_review" | "linked" | "rejected" | "archived" | "uploaded";
  fileName: string;
  mimeType: string;
  previewDataUrl: string;
  rotation: number;
  notes?: string;
  events: ReceiptPaymentEvent[];
};

export type AuditLog = {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  createdAt: string;
};

export type DashboardSummary = {
  rangeLabel: string;
  from: string;
  to: string;
  crates: number;
  trips: number;
  farmerCount: number;
  freightPaise: number;
  receivedPaise: number;
  expensesPaise: number;
  outstandingPaise: number;
  accrualProfitPaise: number;
  cashSurplusPaise: number;
};

export type DayFarmerRow = {
  farmerId: string;
  farmerCode: string;
  fullName: string;
  village: string;
  crates: number;
  freightPaise: number;
  outstandingPaise: number;
};

export type DailySheet = {
  from: string;
  to: string;
  trips: number;
  crates: number;
  farmerCount: number;
  freightPaise: number;
  farmers: DayFarmerRow[];
};

export type LedgerLine = {
  id: string;
  date: string;
  type: "freight" | "payment" | "adjustment";
  description: string;
  crates?: number;
  debitPaise: number;
  creditPaise: number;
  runningBalancePaise: number;
};
