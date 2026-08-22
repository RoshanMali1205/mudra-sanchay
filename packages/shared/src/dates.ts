export const DATE_PRESETS = [
  "today",
  "week",
  "month",
  "quarter",
  "half_year",
  "year",
  "custom"
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];

export function kolkataToday(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = Date.UTC(year!, month! - 1, day! + days);
  return new Date(utc).toISOString().slice(0, 10);
}

export function inRange(isoDate: string, from: string, to: string): boolean {
  return isoDate >= from && isoDate <= to;
}

export function resolveDateRange(
  preset: string = "today",
  from?: string,
  to?: string
): { from: string; to: string; label: DatePreset } {
  const today = kolkataToday();
  const label = (DATE_PRESETS.includes(preset as DatePreset) ? preset : "today") as DatePreset;

  if (label === "custom" && from && to) {
    return { from, to, label };
  }

  const startByPreset: Record<Exclude<DatePreset, "custom">, string> = {
    today,
    week: addDaysIso(today, -6),
    month: addDaysIso(today, -29),
    quarter: addDaysIso(today, -89),
    half_year: addDaysIso(today, -179),
    year: addDaysIso(today, -364)
  };

  if (label === "custom") {
    return { from: from ?? today, to: to ?? today, label };
  }

  return { from: startByPreset[label], to: today, label };
}
