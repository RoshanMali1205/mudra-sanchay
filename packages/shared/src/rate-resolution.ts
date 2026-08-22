import { DEFAULT_RATE_PAISE } from "./constants.js";
import type { RateSource } from "./types.js";

export type RateCandidate = {
  farmerRatePaise?: number | null;
  routeRatePaise?: number | null;
  businessDefaultRatePaise?: number | null;
  manualRatePaise?: number | null;
};

export function resolveFreightRate(candidate: RateCandidate): {
  ratePaise: number;
  source: RateSource;
} {
  if (isUsableRate(candidate.manualRatePaise)) {
    return { ratePaise: candidate.manualRatePaise, source: "manual" };
  }
  if (isUsableRate(candidate.farmerRatePaise)) {
    return { ratePaise: candidate.farmerRatePaise, source: "farmer" };
  }
  if (isUsableRate(candidate.routeRatePaise)) {
    return { ratePaise: candidate.routeRatePaise, source: "route" };
  }
  if (isUsableRate(candidate.businessDefaultRatePaise)) {
    return {
      ratePaise: candidate.businessDefaultRatePaise,
      source: "business_default"
    };
  }
  return { ratePaise: DEFAULT_RATE_PAISE, source: "business_default" };
}

function isUsableRate(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
