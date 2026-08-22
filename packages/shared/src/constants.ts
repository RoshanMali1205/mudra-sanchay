export const APP_NAME = "Mudra Sanchay";
export const APP_CODE = "mudra_sanchay";
export const RECEIPT_BUCKET = "mudra-receipts";
export const PRINT_BRAND = "Radhe Krishna Transport by Dnyaneshwar Jejurkar";
export const DEVELOPER_FOOTER = "All Rights Reserved. Developed by Roshan Mali © 2026";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_RATE_PAISE = 2500;
export const DEFAULT_LANGUAGE = "en" as const;
export const SUPPORTED_LANGUAGES = ["en", "hi", "mr"] as const;
export const API_PREFIX = "/api/v1";
export const MAX_CRATE_COUNT = 5000;
export const MAX_FUTURE_DAYS = 1;

export const PAYMENT_MODES = [
  "cash",
  "upi",
  "bank_transfer",
  "cheque",
  "adjustment"
] as const;

export const TRIP_STATUSES = ["draft", "completed", "cancelled"] as const;
export const MEMBER_ROLES = ["admin", "operator", "viewer"] as const;
export const RATE_SOURCES = ["manual", "farmer", "route", "business_default"] as const;

export const EXPENSE_CATEGORY_CODES = [
  "diesel",
  "engine_oil",
  "puncture",
  "repair",
  "spare_part",
  "helper_salary",
  "toll_parking",
  "food_allowance",
  "other"
] as const;

export const RECEIPT_PAYMENT_STATUSES = [
  "uploaded",
  "linked",
  "awaiting_payment",
  "partially_paid",
  "paid",
  "needs_review",
  "rejected",
  "archived"
] as const;
