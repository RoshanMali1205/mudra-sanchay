import { z } from "zod";
import { MAX_CRATE_COUNT, PAYMENT_MODES } from "./constants.js";

export const uuidSchema = z.string().uuid();

export const moneyPaiseSchema = z.number().int().positive();

export const crateCountSchema = z.number().int().positive().max(MAX_CRATE_COUNT);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const onboardingSchema = z.object({
  businessName: z.string().min(2).max(160).default("Radhe Krishna Transport"),
  printName: z
    .string()
    .min(2)
    .max(200)
    .default("Radhe Krishna Transport by Dnyaneshwar Jejurkar"),
  ownerName: z.string().min(2).max(120),
  phone: z.string().min(8).max(20).optional(),
  defaultLanguage: z.enum(["en", "hi", "mr"]).default("en"),
  defaultRatePaise: z.number().int().nonnegative().default(2500),
  vehicleRegistration: z.string().min(4).max(20),
  vehicleDisplayName: z.string().min(2).max(80),
  originName: z.string().min(2).max(80).default("Ugaon"),
  destinationName: z.string().min(2).max(80).default("Pimpalgaon Baswant")
});

export const farmerCreateSchema = z.object({
  fullName: z.string().min(2).max(120),
  village: z.string().min(2).max(120),
  mobile: z
    .string()
    .regex(/^[0-9+\-\s]{8,20}$/)
    .optional()
    .or(z.literal("")),
  alternateMobile: z.string().max(20).optional(),
  address: z.string().max(240).optional(),
  preferredLanguage: z.enum(["en", "hi", "mr"]).optional(),
  notes: z.string().max(500).optional(),
  openingBalancePaise: z.number().int().default(0)
});

export const farmerUpdateSchema = farmerCreateSchema.partial();

export const tripCreateSchema = z.object({
  tripDate: z.string().date(),
  vehicleId: uuidSchema,
  routeId: uuidSchema,
  tripNumber: z.number().int().positive().optional(),
  notes: z.string().max(500).optional()
});

export const crateEntryCreateSchema = z.object({
  farmerId: uuidSchema,
  crateCount: crateCountSchema,
  ratePaise: z.number().int().nonnegative().optional(),
  notes: z.string().max(240).optional()
});

export const crateEntryPatchSchema = z.object({
  farmerId: uuidSchema.optional(),
  crateCount: z.number().int().nonnegative().max(MAX_CRATE_COUNT).optional(),
  ratePaise: z.number().int().nonnegative().optional(),
  notes: z.string().max(240).optional()
});

export const paymentCreateSchema = z.object({
  farmerId: uuidSchema,
  paymentDate: z.string().date(),
  amountPaise: moneyPaiseSchema,
  mode: z.enum(PAYMENT_MODES),
  referenceNumber: z.string().max(80).optional(),
  notes: z.string().max(240).optional(),
  idempotencyKey: z.string().uuid().optional()
});

export const expenseCreateSchema = z.object({
  expenseDate: z.string().date(),
  categoryCode: z.string().min(2),
  amountPaise: moneyPaiseSchema,
  vehicleId: uuidSchema.optional(),
  tripId: uuidSchema.optional(),
  vendorName: z.string().max(120).optional(),
  paymentMode: z.enum(PAYMENT_MODES).default("cash"),
  notes: z.string().max(240).optional()
});

export const paymentCreateSchemaExtended = paymentCreateSchema.extend({
  confirmAdvance: z.boolean().optional()
});

export const paymentCorrectSchema = z.object({
  amountPaise: moneyPaiseSchema,
  reason: z.string().min(3).max(240)
});

export const tripReopenSchema = z.object({
  reason: z.string().min(3).max(240)
});

export const copyFarmersSchema = z.object({
  sourceTripId: uuidSchema,
  farmerIds: z.array(uuidSchema).min(1)
});

export const receiptCreateSchema = z.object({
  farmerId: uuidSchema.optional(),
  tripId: uuidSchema.optional(),
  receiptNumber: z.string().max(80).optional(),
  receiptDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  grossAmountPaise: z.number().int().nonnegative().optional(),
  deductionAmountPaise: z.number().int().nonnegative().optional(),
  netAmountPaise: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(3),
  previewDataUrl: z.string().min(20),
  confirmOcr: z.boolean().optional()
});

export const receiptUpdateSchema = z.object({
  farmerId: uuidSchema.optional(),
  tripId: uuidSchema.optional(),
  receiptNumber: z.string().max(80).optional(),
  receiptDate: z.string().date().optional(),
  dueDate: z.string().date().optional(),
  grossAmountPaise: z.number().int().nonnegative().optional(),
  deductionAmountPaise: z.number().int().nonnegative().optional(),
  netAmountPaise: z.number().int().nonnegative().optional(),
  reviewStatus: z.enum(["needs_review", "linked", "rejected", "archived"]).optional(),
  notes: z.string().max(500).optional(),
  rotation: z.number().int().optional()
});

export const receiptPaymentEventSchema = z.object({
  eventDate: z.string().date(),
  amountPaise: moneyPaiseSchema,
  mode: z.enum(PAYMENT_MODES),
  referenceNumber: z.string().max(80).optional(),
  notes: z.string().max(240).optional(),
  confirmOverpay: z.boolean().optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type FarmerCreateInput = z.infer<typeof farmerCreateSchema>;
export type TripCreateInput = z.infer<typeof tripCreateSchema>;
export type CrateEntryCreateInput = z.infer<typeof crateEntryCreateSchema>;
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
