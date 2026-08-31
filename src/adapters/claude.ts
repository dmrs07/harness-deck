import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { usageWindow, type UsageSnapshot, type UsageWindow } from "../domain/usage.js";

type CacheWindow = {
  usedPercent?: number;
  resetsAt?: number;
  updatedAt?: number;
};

type CachePayload = {
  updatedAt?: number;
  fiveHour?: CacheWindow;
  sevenDay?: CacheWindow;
};

const CACHE_PATH = join(homedir(), ".harness-deck", "claude-usage.json");
const STALE_AFTER_MS = 15 * 60 * 1000;

export async function readClaudeUsage(): Promise<UsageSnapshot> {
  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    const payload = JSON.parse(raw) as CachePayload;
    const now = Date.now();
    const fallbackUpdatedAt = typeof payload.updatedAt === "number" ? payload.updatedAt : now;

    const fiveHour = readFreshWindow(payload.fiveHour, fallbackUpdatedAt, now);
    const sevenDay = readFreshWindow(payload.sevenDay, fallbackUpdatedAt, now);
    const hasExpiredWindow = isExpired(payload.fiveHour, fallbackUpdatedAt, now) || isExpired(payload.sevenDay, fallbackUpdatedAt, now);
    const updatedAt = Math.max(
      windowUpdatedAt(payload.fiveHour, fallbackUpdatedAt),
      windowUpdatedAt(payload.sevenDay, fallbackUpdatedAt)
    );

    return {
      provider: "claude",
      fiveHour,
      sevenDay,
      updatedAt,
      stale: hasExpiredWindow
    };
  } catch {
    return {
      provider: "claude",
      updatedAt: Date.now(),
      error: "Claude cache unavailable. Configure the Harness Deck statusLine bridge."
    };
  }
}

function readFreshWindow(window: CacheWindow | undefined, fallbackUpdatedAt: number, now: number): UsageWindow | undefined {
  if (!window || isExpired(window, fallbackUpdatedAt, now)) return undefined;
  return usageWindow(window.usedPercent, window.resetsAt);
}

function isExpired(window: CacheWindow | undefined, fallbackUpdatedAt: number, now: number): boolean {
  if (!window) return false;
  return now - windowUpdatedAt(window, fallbackUpdatedAt) > STALE_AFTER_MS;
}

function windowUpdatedAt(window: CacheWindow | undefined, fallbackUpdatedAt: number): number {
  return typeof window?.updatedAt === "number" ? window.updatedAt : fallbackUpdatedAt;
}
