import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { usageWindow, type UsageSnapshot } from "../domain/usage.js";

type CachePayload = {
  updatedAt?: number;
  fiveHour?: { usedPercent?: number; resetsAt?: number };
  sevenDay?: { usedPercent?: number; resetsAt?: number };
};

const CACHE_PATH = join(homedir(), ".harness-deck", "claude-usage.json");
const STALE_AFTER_MS = 15 * 60 * 1000;

export async function readClaudeUsage(): Promise<UsageSnapshot> {
  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    const payload = JSON.parse(raw) as CachePayload;
    const updatedAt = typeof payload.updatedAt === "number" ? payload.updatedAt : Date.now();

    return {
      provider: "claude",
      fiveHour: usageWindow(payload.fiveHour?.usedPercent, payload.fiveHour?.resetsAt),
      sevenDay: usageWindow(payload.sevenDay?.usedPercent, payload.sevenDay?.resetsAt),
      updatedAt,
      stale: Date.now() - updatedAt > STALE_AFTER_MS
    };
  } catch {
    return {
      provider: "claude",
      updatedAt: Date.now(),
      error: "Claude cache unavailable. Configure the Harness Deck statusLine bridge."
    };
  }
}
