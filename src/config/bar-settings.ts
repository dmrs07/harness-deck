export type BarMode = "completing" | "depleting";

export type UsageBarSettings = {
  fiveHourMode?: BarMode;
  sevenDayMode?: BarMode;
  stripSegments?: number;
  stripStartColumn?: number;
};

export type ResolvedUsageBarSettings = {
  fiveHourMode: BarMode;
  sevenDayMode: BarMode;
};

export type ResolvedStripSettings = ResolvedUsageBarSettings & {
  stripSegments: number;
  stripStartColumn: number;
};

export const DEFAULT_USAGE_BAR_SETTINGS: ResolvedUsageBarSettings = {
  fiveHourMode: "completing",
  sevenDayMode: "completing"
};

export const DEFAULT_STRIP_SETTINGS: ResolvedStripSettings = {
  ...DEFAULT_USAGE_BAR_SETTINGS,
  stripSegments: 5,
  stripStartColumn: 0
};

export function resolveUsageBarSettings(settings: UsageBarSettings | undefined): ResolvedUsageBarSettings {
  return {
    fiveHourMode: normalizeBarMode(settings?.fiveHourMode),
    sevenDayMode: normalizeBarMode(settings?.sevenDayMode)
  };
}

export function resolveStripSettings(settings: UsageBarSettings | undefined): ResolvedStripSettings {
  return {
    ...resolveUsageBarSettings(settings),
    stripSegments: clampInteger(settings?.stripSegments, 1, 8, DEFAULT_STRIP_SETTINGS.stripSegments),
    stripStartColumn: clampInteger(settings?.stripStartColumn, 0, 7, DEFAULT_STRIP_SETTINGS.stripStartColumn)
  };
}

function normalizeBarMode(value: unknown): BarMode {
  return value === "depleting" ? "depleting" : "completing";
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}
