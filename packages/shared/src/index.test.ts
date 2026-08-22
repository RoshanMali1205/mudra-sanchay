import { describe, expect, it } from "vitest";
import { calculateFreightPaise, farmerClosingBalancePaise, formatInrFromPaise, periodProfit, resolveDateRange, resolveFreightRate, rupeesToPaise } from "./index.js";

describe("freight calculation", () => {
  it("charges 50 crates at INR 25 as INR 1,250", () => {
    expect(calculateFreightPaise(50, rupeesToPaise(25))).toBe(125000);
    expect(formatInrFromPaise(125000)).toContain("1,250");
  });
});

describe("rate priority", () => {
  it("uses manual, then farmer, then route, then business default", () => {
    expect(
      resolveFreightRate({
        manualRatePaise: 3000,
        farmerRatePaise: 2800,
        routeRatePaise: 2600,
        businessDefaultRatePaise: 2500
      })
    ).toEqual({ ratePaise: 3000, source: "manual" });

    expect(
      resolveFreightRate({
        farmerRatePaise: 2800,
        routeRatePaise: 2600,
        businessDefaultRatePaise: 2500
      })
    ).toEqual({ ratePaise: 2800, source: "farmer" });
  });
});

describe("balances and profit", () => {
  it("keeps INR 250 outstanding after a partial payment", () => {
    expect(
      farmerClosingBalancePaise({
        openingBalancePaise: 0,
        freightChargesPaise: 125000,
        debitAdjustmentsPaise: 0,
        paymentsPaise: 100000,
        creditAdjustmentsPaise: 0
      })
    ).toBe(25000);
  });

  it("separates accrual profit from cash surplus", () => {
    expect(
      periodProfit({
        grossIncomePaise: 125000,
        cashReceivedPaise: 100000,
        expensesPaise: 40000
      })
    ).toEqual({
      accrualProfitPaise: 85000,
      cashSurplusPaise: 60000
    });
  });
});

describe("date presets", () => {
  it("resolves a week range ending today", () => {
    const range = resolveDateRange("week");
    expect(range.to >= range.from).toBe(true);
    expect(range.label).toBe("week");
  });
});
