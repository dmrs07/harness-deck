export type BarMode = "completing" | "depleting";

export type UsageBarSettings = {
  fiveHourMode?: BarMode;
  sevenDayMode?: BarMode;
};

export type ResolvedUsageBarSettings = {
  fiveHourMode: BarMode;
  sevenDayMode: BarMode;
};

export const DEFAULT_USAGE_BAR_SETTINGS: ResolvedUsageBarSettings = {
  fiveHourMode: "completing",
  sevenDayMode: "completing"
};

export function resolveUsageBarSettings(settings: UsageBarSettings | undefined): ResolvedUsageBarSettings {
  return {
    fiveHourMode: normalizeBarMode(settings?.fiveHourMode),
    sevenDayMode: normalizeBarMode(settings?.sevenDayMode)
  };
}

function normalizeBarMode(value: unknown): BarMode {
  return value === "depleting" ? "depleting" : "completing";
}
