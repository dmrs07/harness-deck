export type BarMode = "completing" | "depleting";

export const THEME_IDS = [
  "harness",
  "ravena",
  "glob",
  "kraken",
  "aurix",
  "fornalha",
  "cryo",
  "terminal",
  "synthwave",
  "alerta-carmesim",
  "e-ink"
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type UsageBarSettings = {
  fiveHourMode?: BarMode;
  sevenDayMode?: BarMode;
  theme?: ThemeId;
  stripSegments?: number;
  stripStartColumn?: number;
};

export type ResolvedUsageBarSettings = {
  fiveHourMode: BarMode;
  sevenDayMode: BarMode;
  theme: ThemeId;
};

export type ResolvedStripSettings = ResolvedUsageBarSettings & {
  stripSegments: number;
  stripStartColumn: number;
};

export const DEFAULT_USAGE_BAR_SETTINGS: ResolvedUsageBarSettings = {
  fiveHourMode: "completing",
  sevenDayMode: "completing",
  theme: "harness"
};

export const DEFAULT_STRIP_SETTINGS: ResolvedStripSettings = {
  ...DEFAULT_USAGE_BAR_SETTINGS,
  stripSegments: 5,
  stripStartColumn: 0
};

export function resolveUsageBarSettings(settings: UsageBarSettings | undefined): ResolvedUsageBarSettings {
  return {
    fiveHourMode: normalizeBarMode(settings?.fiveHourMode),
    sevenDayMode: normalizeBarMode(settings?.sevenDayMode),
    theme: normalizeTheme(settings?.theme)
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

function normalizeTheme(value: unknown): ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value)
    ? value as ThemeId
    : DEFAULT_USAGE_BAR_SETTINGS.theme;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}
