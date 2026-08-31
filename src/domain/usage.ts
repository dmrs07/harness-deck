export type Provider = "codex" | "claude";

export type UsageWindow = {
  usedPercent: number;
  resetsAt?: number;
};

export type UsageSnapshot = {
  provider: Provider;
  fiveHour?: UsageWindow;
  sevenDay?: UsageWindow;
  updatedAt: number;
  stale?: boolean;
  error?: string;
};

export function clampPercent(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, n));
}

export function usageWindow(usedPercent: unknown, resetsAt: unknown): UsageWindow | undefined {
  const used = clampPercent(usedPercent);
  if (used === undefined) return undefined;
  const reset = typeof resetsAt === "number" && Number.isFinite(resetsAt) ? resetsAt : undefined;
  return { usedPercent: used, resetsAt: reset };
}
