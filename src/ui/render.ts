import type { Provider, UsageSnapshot, UsageWindow } from "../domain/usage.js";

const PROVIDER_LABEL: Record<Provider, string> = {
  codex: "CODEX",
  claude: "CLAUDE"
};

const PROVIDER_ACCENT: Record<Provider, string> = {
  codex: "#76e6a6",
  claude: "#d5a36f"
};

export function renderProvider(snapshot: UsageSnapshot | undefined, provider: Provider): string {
  const label = PROVIDER_LABEL[provider];
  const accent = PROVIDER_ACCENT[provider];

  if (!snapshot) return svgDataUrl(shell(label, accent, "Loading…"));
  if (snapshot.error) return svgDataUrl(shell(label, "#ff7b7b", "NO DATA", shortError(snapshot.error)));

  const stale = snapshot.stale ? "STALE" : undefined;
  return svgDataUrl(usageSvg(label, accent, snapshot.fiveHour, snapshot.sevenDay, stale));
}

export function renderCombined(codex?: UsageSnapshot, claude?: UsageSnapshot): string {
  const candidates = [codex, claude].filter((item): item is UsageSnapshot => Boolean(item && !item.error));
  if (!candidates.length) return svgDataUrl(shell("AI USAGE", "#8fb5ff", "NO DATA"));

  const scored = candidates.map((snapshot) => ({
    snapshot,
    score: Math.max(snapshot.fiveHour?.usedPercent ?? 0, snapshot.sevenDay?.usedPercent ?? 0)
  }));
  scored.sort((a, b) => b.score - a.score);

  const worst = scored[0].snapshot;
  return svgDataUrl(usageSvg(`AI · ${PROVIDER_LABEL[worst.provider]}`, PROVIDER_ACCENT[worst.provider], worst.fiveHour, worst.sevenDay, worst.stale ? "STALE" : undefined));
}

function usageSvg(label: string, accent: string, fiveHour?: UsageWindow, sevenDay?: UsageWindow, badge?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="24" fill="#111318"/>
  <text x="14" y="25" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>
  ${badge ? `<text x="130" y="25" text-anchor="end" font-family="Arial,sans-serif" font-size="9" fill="#ffca66">${badge}</text>` : ""}
  ${bar("5H", fiveHour, 43, accent)}
  ${bar("7D", sevenDay, 90, accent)}
</svg>`;
}

function bar(label: string, window: UsageWindow | undefined, y: number, accent: string): string {
  if (!window) {
    return `<text x="14" y="${y + 17}" font-family="Arial,sans-serif" font-size="12" fill="#7f8795">${label} —</text>`;
  }

  const used = Math.round(window.usedPercent);
  const width = Math.max(0, Math.min(104, 104 * (window.usedPercent / 100)));
  const reset = formatReset(window.resetsAt);
  const fill = used >= 90 ? "#ff6b6b" : used >= 75 ? "#ffca66" : accent;

  return `<text x="14" y="${y}" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#c8cdd6">${label}</text>
  <text x="130" y="${y}" text-anchor="end" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#ffffff">${used}%</text>
  <rect x="14" y="${y + 8}" width="116" height="10" rx="5" fill="#30343d"/>
  <rect x="14" y="${y + 8}" width="${width * (116 / 104)}" height="10" rx="5" fill="${fill}"/>
  <text x="14" y="${y + 31}" font-family="Arial,sans-serif" font-size="9" fill="#7f8795">reset ${reset}</text>`;
}

function shell(label: string, accent: string, headline: string, detail?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="24" fill="#111318"/>
  <circle cx="20" cy="22" r="5" fill="${accent}"/>
  <text x="32" y="27" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>
  <text x="72" y="75" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#ffffff">${escapeXml(headline)}</text>
  ${detail ? `<text x="72" y="96" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#7f8795">${escapeXml(detail)}</text>` : ""}
</svg>`;
}

function formatReset(epochSeconds?: number): string {
  if (!epochSeconds) return "?";
  const delta = Math.max(0, epochSeconds * 1000 - Date.now());
  const minutes = Math.ceil(delta / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.ceil(hours / 24)}d`;
}

function shortError(message: string): string {
  return message.length <= 34 ? message : `${message.slice(0, 31)}…`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[char] ?? char);
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
