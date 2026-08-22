export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatInrFromPaise(
  paise: number,
  locale: string = "en-IN"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(paiseToRupees(paise));
}

export function calculateFreightPaise(crateCount: number, ratePaise: number): number {
  if (!Number.isInteger(crateCount) || crateCount <= 0) {
    throw new Error("Crate count must be a positive integer");
  }
  if (!Number.isInteger(ratePaise) || ratePaise < 0) {
    throw new Error("Rate must be a non-negative integer in paise");
  }
  return crateCount * ratePaise;
}

export function farmerClosingBalancePaise(input: {
  openingBalancePaise: number;
  freightChargesPaise: number;
  debitAdjustmentsPaise: number;
  paymentsPaise: number;
  creditAdjustmentsPaise: number;
}): number {
  return (
    input.openingBalancePaise +
    input.freightChargesPaise +
    input.debitAdjustmentsPaise -
    input.paymentsPaise -
    input.creditAdjustmentsPaise
  );
}

export function periodProfit(input: {
  grossIncomePaise: number;
  cashReceivedPaise: number;
  expensesPaise: number;
}): { accrualProfitPaise: number; cashSurplusPaise: number } {
  return {
    accrualProfitPaise: input.grossIncomePaise - input.expensesPaise,
    cashSurplusPaise: input.cashReceivedPaise - input.expensesPaise
  };
}
