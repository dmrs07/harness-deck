import type { BarMode, ResolvedStripSettings, ResolvedUsageBarSettings } from "../config/bar-settings.js";
import { DEFAULT_STRIP_SETTINGS, DEFAULT_USAGE_BAR_SETTINGS } from "../config/bar-settings.js";
import type { Provider, UsageSnapshot, UsageWindow } from "../domain/usage.js";

const PROVIDER_LABEL: Record<Provider, string> = {
  codex: "CODEX",
  claude: "CLAUDE"
};

const PROVIDER_ACCENT: Record<Provider, string> = {
  codex: "#76e6a6",
  claude: "#d5a36f"
};

export function renderProvider(
  snapshot: UsageSnapshot | undefined,
  provider: Provider,
  settings: ResolvedUsageBarSettings = DEFAULT_USAGE_BAR_SETTINGS
): string {
  const label = PROVIDER_LABEL[provider];
  const accent = PROVIDER_ACCENT[provider];

  if (!snapshot) return svgDataUrl(shell(label, accent, "Loading…"));
  if (snapshot.error) return svgDataUrl(shell(label, "#ff7b7b", "NO DATA", shortError(snapshot.error)));

  const stale = snapshot.stale ? "STALE" : undefined;
  return svgDataUrl(usageSvg(label, accent, snapshot.fiveHour, snapshot.sevenDay, settings, stale));
}

export function renderCombined(
  codex?: UsageSnapshot,
  claude?: UsageSnapshot,
  settings: ResolvedUsageBarSettings = DEFAULT_USAGE_BAR_SETTINGS
): string {
  const candidates = [codex, claude].filter((item): item is UsageSnapshot => Boolean(item && !item.error));
  if (!candidates.length) return svgDataUrl(shell("AI USAGE", "#8fb5ff", "NO DATA"));

  const scored = candidates.map((snapshot) => ({
    snapshot,
    score: Math.max(snapshot.fiveHour?.usedPercent ?? 0, snapshot.sevenDay?.usedPercent ?? 0)
  }));
  scored.sort((a, b) => b.score - a.score);

  const worst = scored[0].snapshot;
  return svgDataUrl(
    usageSvg(
      `AI · ${PROVIDER_LABEL[worst.provider]}`,
      PROVIDER_ACCENT[worst.provider],
      worst.fiveHour,
      worst.sevenDay,
      settings,
      worst.stale ? "STALE" : undefined
    )
  );
}

export function renderStripSegment(
  snapshot: UsageSnapshot | undefined,
  provider: Provider,
  column: number,
  settings: ResolvedStripSettings = DEFAULT_STRIP_SETTINGS
): string {
  const label = PROVIDER_LABEL[provider];
  const accent = PROVIDER_ACCENT[provider];
  const segmentIndex = column - settings.stripStartColumn;

  if (segmentIndex < 0 || segmentIndex >= settings.stripSegments) {
    return svgDataUrl(shell("USAGE STRIP", "#ffca66", "OUTSIDE", `cols ${settings.stripStartColumn + 1}-${settings.stripStartColumn + settings.stripSegments}`));
  }
  if (!snapshot) return svgDataUrl(stripShellSegment(label, accent, segmentIndex, settings.stripSegments, "Loading…"));
  if (snapshot.error) return svgDataUrl(stripShellSegment(label, "#ff7b7b", segmentIndex, settings.stripSegments, "NO DATA"));

  return svgDataUrl(
    stripSvg(
      label,
      accent,
      snapshot.fiveHour,
      snapshot.sevenDay,
      settings,
      segmentIndex,
      snapshot.stale ? "STALE" : undefined
    )
  );
}

function usageSvg(
  label: string,
  accent: string,
  fiveHour: UsageWindow | undefined,
  sevenDay: UsageWindow | undefined,
  settings: ResolvedUsageBarSettings,
  badge?: string
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="24" fill="#111318"/>
  <text x="14" y="25" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>
  ${badge ? `<text x="130" y="25" text-anchor="end" font-family="Arial,sans-serif" font-size="9" fill="#ffca66">${badge}</text>` : ""}
  ${bar("5H", fiveHour, settings.fiveHourMode, 43, accent)}
  ${bar("7D", sevenDay, settings.sevenDayMode, 90, accent)}
</svg>`;
}

function stripSvg(
  label: string,
  accent: string,
  fiveHour: UsageWindow | undefined,
  sevenDay: UsageWindow | undefined,
  settings: ResolvedStripSettings,
  segmentIndex: number,
  badge?: string
): string {
  const keyWidth = 144;
  const totalWidth = settings.stripSegments * keyWidth;
  const offset = segmentIndex * keyWidth;
  const five = stripMetric(fiveHour, settings.fiveHourMode, accent);
  const weekly = stripMetric(sevenDay, settings.sevenDayMode, accent);
  const primaryValueX = stripAnchorX(settings.stripSegments, keyWidth) - offset;
  const leftX = 16 - offset;
  const rightX = totalWidth - 16 - offset;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="#111318"/>
  <rect width="144" height="119" fill="#292d35"/>
  ${five.window ? `<rect x="${-offset}" y="0" width="${five.width * totalWidth}" height="119" fill="${five.color}" opacity="0.88"/>` : ""}
  <rect y="123" width="144" height="21" fill="#30343d"/>
  ${weekly.window ? `<rect x="${-offset}" y="123" width="${weekly.width * totalWidth}" height="21" fill="${weekly.color}"/>` : ""}
  <rect y="118" width="144" height="5" fill="#111318"/>
  <text x="${leftX}" y="24" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#ffffff">${escapeXml(label)} · 5H ${five.qualifier}</text>
  ${badge ? `<text x="${leftX}" y="42" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#ffca66">${badge}</text>` : ""}
  <text x="${primaryValueX}" y="79" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" font-weight="800" fill="#ffffff">${five.window ? `${five.value}%` : "—"}</text>
  <text x="${rightX}" y="104" text-anchor="end" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#ffffff">${five.window ? `reset ${formatReset(five.window.resetsAt)}` : "5h unavailable"}</text>
  <text x="${leftX}" y="138" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#ffffff">7D ${weekly.qualifier}</text>
  <text x="${rightX}" y="138" text-anchor="end" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#ffffff">${weekly.window ? `${weekly.value}% · ${formatReset(weekly.window.resetsAt)}` : "—"}</text>
</svg>`;
}

function stripShellSegment(label: string, accent: string, segmentIndex: number, segments: number, headline: string): string {
  const keyWidth = 144;
  const offset = segmentIndex * keyWidth;
  const primaryValueX = stripAnchorX(segments, keyWidth) - offset;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="#111318"/>
  <rect width="144" height="119" fill="#292d35"/>
  <rect y="123" width="144" height="21" fill="#30343d"/>
  <rect y="118" width="144" height="5" fill="#111318"/>
  <text x="${16 - offset}" y="24" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${accent}">${escapeXml(label)} · 5H</text>
  <text x="${primaryValueX}" y="76" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#ffffff">${escapeXml(headline)}</text>
</svg>`;
}

function stripAnchorX(segments: number, keyWidth: number): number {
  const anchorSegment = Math.floor((segments - 1) / 2);
  return anchorSegment * keyWidth + keyWidth / 2;
}

function stripMetric(window: UsageWindow | undefined, mode: BarMode, accent: string) {
  if (!window) {
    return { window: undefined, width: 0, value: 0, qualifier: mode === "depleting" ? "LEFT" : "USED", color: accent };
  }
  const used = Math.max(0, Math.min(100, window.usedPercent));
  const visualPercent = mode === "depleting" ? 100 - used : used;
  return {
    window,
    width: visualPercent / 100,
    value: Math.round(visualPercent),
    qualifier: mode === "depleting" ? "LEFT" : "USED",
    color: riskColor(used, accent)
  };
}

function bar(label: string, window: UsageWindow | undefined, mode: BarMode, y: number, accent: string): string {
  if (!window) {
    return `<text x="14" y="${y + 17}" font-family="Arial,sans-serif" font-size="12" fill="#7f8795">${label} —</text>`;
  }

  const used = Math.max(0, Math.min(100, window.usedPercent));
  const visualPercent = mode === "depleting" ? 100 - used : used;
  const value = Math.round(visualPercent);
  const width = 116 * (visualPercent / 100);
  const reset = formatReset(window.resetsAt);
  const fill = riskColor(used, accent);
  const qualifier = mode === "depleting" ? "LEFT" : "USED";

  return `<text x="14" y="${y}" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#c8cdd6">${label} ${qualifier}</text>
  <text x="130" y="${y}" text-anchor="end" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#ffffff">${value}%</text>
  <rect x="14" y="${y + 8}" width="116" height="10" rx="5" fill="#30343d"/>
  <rect x="14" y="${y + 8}" width="${width}" height="10" rx="5" fill="${fill}"/>
  <text x="14" y="${y + 31}" font-family="Arial,sans-serif" font-size="9" fill="#7f8795">reset ${reset}</text>`;
}

function riskColor(usedPercent: number, accent: string): string {
  return usedPercent >= 90 ? "#ff6b6b" : usedPercent >= 75 ? "#ffca66" : accent;
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
