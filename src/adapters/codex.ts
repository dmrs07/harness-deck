import { spawn } from "node:child_process";
import readline from "node:readline";
import { usageWindow, type UsageSnapshot, type UsageWindow } from "../domain/usage.js";

type RpcMessage = {
  id?: number;
  result?: unknown;
  error?: { message?: string };
};

type RawWindow = {
  usedPercent?: number;
  windowDurationMins?: number;
  resetsAt?: number;
};

type RateLimitsResult = {
  rateLimits?: {
    primary?: RawWindow | null;
    secondary?: RawWindow | null;
  };
};

const FIVE_HOURS_MINUTES = 300;
const SEVEN_DAYS_MINUTES = 10_080;

export async function readCodexUsage(timeoutMs = 5_000): Promise<UsageSnapshot> {
  const updatedAt = Date.now();

  try {
    const result = await requestRateLimits(timeoutMs);
    const windows = [result.rateLimits?.primary, result.rateLimits?.secondary].filter(Boolean) as RawWindow[];

    const fiveHour = pickWindow(windows, FIVE_HOURS_MINUTES) ?? normalizeWindow(result.rateLimits?.primary);
    const sevenDay = pickWindow(windows, SEVEN_DAYS_MINUTES) ?? normalizeWindow(result.rateLimits?.secondary);

    return { provider: "codex", fiveHour, sevenDay, updatedAt };
  } catch (error) {
    return {
      provider: "codex",
      updatedAt,
      error: error instanceof Error ? error.message : "Unable to read Codex usage"
    };
  }
}

function normalizeWindow(window: RawWindow | null | undefined): UsageWindow | undefined {
  return window ? usageWindow(window.usedPercent, window.resetsAt) : undefined;
}

function pickWindow(windows: RawWindow[], duration: number): UsageWindow | undefined {
  const match = windows.find((window) => window.windowDurationMins === duration);
  return normalizeWindow(match);
}

function requestRateLimits(timeoutMs: number): Promise<RateLimitsResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });

    const lines = readline.createInterface({ input: child.stdout });
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      lines.close();
      child.kill();
      fn();
    };

    const send = (message: unknown) => child.stdin.write(`${JSON.stringify(message)}\n`);

    const timer = setTimeout(() => {
      finish(() => reject(new Error("Codex app-server timed out")));
    }, timeoutMs);

    child.on("error", (error) => finish(() => reject(new Error(`Unable to start Codex CLI: ${error.message}`))));

    child.stderr.on("data", () => {
      // App-server may emit diagnostics on stderr; JSON-RPC stays on stdout.
    });

    lines.on("line", (line) => {
      let message: RpcMessage;
      try {
        message = JSON.parse(line) as RpcMessage;
      } catch {
        return;
      }

      if (message.id === 1) {
        if (message.error) {
          finish(() => reject(new Error(message.error?.message ?? "Codex initialization failed")));
          return;
        }
        send({ method: "initialized", params: {} });
        send({ id: 2, method: "account/rateLimits/read", params: {} });
        return;
      }

      if (message.id === 2) {
        if (message.error) {
          finish(() => reject(new Error(message.error?.message ?? "Codex rate-limit request failed")));
          return;
        }
        finish(() => resolve((message.result ?? {}) as RateLimitsResult));
      }
    });

    send({
      id: 1,
      method: "initialize",
      params: {
        clientInfo: { name: "harness-deck", title: "Harness Deck", version: "0.1.0" },
        capabilities: {}
      }
    });
  });
}
