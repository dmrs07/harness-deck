import { readClaudeUsage } from "../adapters/claude.js";
import { readCodexUsage } from "../adapters/codex.js";
import type { Provider, UsageSnapshot } from "../domain/usage.js";

type Listener = () => void;

class UsageService {
  private readonly snapshots = new Map<Provider, UsageSnapshot>();
  private readonly listeners = new Set<Listener>();
  private timer?: NodeJS.Timeout;
  private refreshInFlight?: Promise<void>;

  start(): void {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), 60_000);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get(provider: Provider): UsageSnapshot | undefined {
    return this.snapshots.get(provider);
  }

  async refresh(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      const [codex, claude] = await Promise.all([readCodexUsage(), readClaudeUsage()]);
      this.snapshots.set("codex", codex);
      this.snapshots.set("claude", claude);
      for (const listener of this.listeners) listener();
    })().finally(() => {
      this.refreshInFlight = undefined;
    });

    return this.refreshInFlight;
  }
}

export const usageService = new UsageService();
