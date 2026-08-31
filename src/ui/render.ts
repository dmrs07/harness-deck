import type { BarMode, ResolvedStripSettings, ResolvedUsageBarSettings } from "../config/bar-settings.js";
import { DEFAULT_STRIP_SETTINGS, DEFAULT_USAGE_BAR_SETTINGS } from "../config/bar-settings.js";
import type { Provider, UsageSnapshot, UsageWindow } from "../domain/usage.js";
import { getTheme, providerTheme, riskColor, textureOverlay, themeDefs, type Theme } from "./themes.js";

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
  const theme = providerTheme(getTheme(settings.theme), PROVIDER_ACCENT[provider]);

  if (!snapshot) return svgDataUrl(shell(label, theme, "Loading…"));
  if (snapshot.error) return svgDataUrl(shell(label, { ...theme, primary: theme.danger }, "NO DATA", shortError(snapshot.error)));

  const stale = snapshot.stale ? "STALE" : undefined;
  return svgDataUrl(usageSvg(label, theme, snapshot.fiveHour, snapshot.sevenDay, settings, stale));
}

export function renderCombined(
  codex?: UsageSnapshot,
  claude?: UsageSnapshot,
  settings: ResolvedUsageBarSettings = DEFAULT_USAGE_BAR_SETTINGS
): string {
  const candidates = [codex, claude].filter((item): item is UsageSnapshot => Boolean(item && !item.error));
  const fallbackTheme = getTheme(settings.theme);
  if (!candidates.length) return svgDataUrl(shell("AI USAGE", fallbackTheme, "NO DATA"));

  const scored = candidates.map((snapshot) => ({
    snapshot,
    score: Math.max(snapshot.fiveHour?.usedPercent ?? 0, snapshot.sevenDay?.usedPercent ?? 0)
  }));
  scored.sort((a, b) => b.score - a.score);

  const worst = scored[0].snapshot;
  const theme = providerTheme(getTheme(settings.theme), PROVIDER_ACCENT[worst.provider]);
  return svgDataUrl(
    usageSvg(
      `AI · ${PROVIDER_LABEL[worst.provider]}`,
      theme,
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
  const theme = providerTheme(getTheme(settings.theme), PROVIDER_ACCENT[provider]);
  const segmentIndex = column - settings.stripStartColumn;

  if (segmentIndex < 0 || segmentIndex >= settings.stripSegments) {
    return svgDataUrl(shell("USAGE STRIP", { ...theme, primary: theme.warning }, "OUTSIDE", `cols ${settings.stripStartColumn + 1}-${settings.stripStartColumn + settings.stripSegments}`));
  }
  if (!snapshot) return svgDataUrl(stripShellSegment(label, theme, segmentIndex, settings.stripSegments, "Loading…"));
  if (snapshot.error) return svgDataUrl(stripShellSegment(label, { ...theme, primary: theme.danger }, segmentIndex, settings.stripSegments, "NO DATA"));

  return svgDataUrl(
    stripSvg(
      label,
      theme,
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
  theme: Theme,
  fiveHour: UsageWindow | undefined,
  sevenDay: UsageWindow | undefined,
  settings: ResolvedUsageBarSettings,
  badge?: string
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  ${themeDefs(theme)}
  <rect width="144" height="144" rx="${theme.radius}" fill="${theme.background}"/>
  ${themeDecoration(theme, 144, 144)}
  ${textureOverlay(theme, 0, 0, 144, 144, 0.1)}
  <text x="14" y="25" font-family="${theme.font}" font-size="13" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${escapeXml(label)}</text>
  ${badge ? `<text x="130" y="25" text-anchor="end" font-family="${theme.font}" font-size="9" font-weight="700" fill="${theme.badge}" ${textStroke(theme)}>${badge}</text>` : ""}
  ${bar("5H", fiveHour, settings.fiveHourMode, 43, theme, "primary")}
  ${bar("7D", sevenDay, settings.sevenDayMode, 90, theme, "secondary")}
</svg>`;
}

function stripSvg(
  label: string,
  theme: Theme,
  fiveHour: UsageWindow | undefined,
  sevenDay: UsageWindow | undefined,
  settings: ResolvedStripSettings,
  segmentIndex: number,
  badge?: string
): string {
  const keyWidth = 144;
  const totalWidth = settings.stripSegments * keyWidth;
  const offset = segmentIndex * keyWidth;
  const five = stripMetric(fiveHour, settings.fiveHourMode, theme, "primary");
  const weekly = stripMetric(sevenDay, settings.sevenDayMode, theme, "secondary");
  const primaryValueX = stripAnchorX(settings.stripSegments, keyWidth) - offset;
  const leftX = 16 - offset;
  const rightX = totalWidth - 16 - offset;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  ${themeDefs(theme)}
  <rect width="144" height="144" fill="${theme.background}"/>
  <rect width="144" height="119" fill="${theme.surface}"/>
  ${themeDecoration(theme, totalWidth, 119, offset)}
  ${five.window ? `<rect x="${-offset}" y="0" width="${five.width * totalWidth}" height="119" fill="${five.color}" opacity="${theme.id === "e-ink" ? 1 : 0.88}"/>` : ""}
  ${five.window ? textureOverlay(theme, -offset, 0, five.width * totalWidth, 119, 0.24) : textureOverlay(theme, -offset, 0, totalWidth, 119, 0.1)}
  <rect y="123" width="144" height="21" fill="${theme.track}"/>
  ${weekly.window ? `<rect x="${-offset}" y="123" width="${weekly.width * totalWidth}" height="21" fill="${weekly.color}"/>` : ""}
  <rect y="118" width="144" height="5" fill="${theme.divider}"/>
  <text x="${leftX}" y="24" font-family="${theme.font}" font-size="12" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${escapeXml(label)} · 5H ${five.qualifier}</text>
  ${badge ? `<text x="${leftX}" y="42" font-family="${theme.font}" font-size="9" font-weight="700" fill="${theme.badge}" ${textStroke(theme)}>${badge}</text>` : ""}
  <text x="${primaryValueX}" y="79" text-anchor="middle" font-family="${theme.font}" font-size="34" font-weight="800" fill="${theme.text}" ${textStroke(theme, 4)}>${five.window ? `${five.value}%` : "—"}</text>
  <text x="${rightX}" y="104" text-anchor="end" font-family="${theme.font}" font-size="10" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${five.window ? `reset ${formatReset(five.window.resetsAt)}` : "5h unavailable"}</text>
  <text x="${leftX}" y="138" font-family="${theme.font}" font-size="9" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>7D ${weekly.qualifier}</text>
  <text x="${rightX}" y="138" text-anchor="end" font-family="${theme.font}" font-size="9" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${weekly.window ? `${weekly.value}% · ${formatReset(weekly.window.resetsAt)}` : "—"}</text>
</svg>`;
}

function stripShellSegment(label: string, theme: Theme, segmentIndex: number, segments: number, headline: string): string {
  const keyWidth = 144;
  const offset = segmentIndex * keyWidth;
  const primaryValueX = stripAnchorX(segments, keyWidth) - offset;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  ${themeDefs(theme)}
  <rect width="144" height="144" fill="${theme.background}"/>
  <rect width="144" height="119" fill="${theme.surface}"/>
  ${textureOverlay(theme, 0, 0, 144, 119, 0.12)}
  <rect y="123" width="144" height="21" fill="${theme.track}"/>
  <rect y="118" width="144" height="5" fill="${theme.divider}"/>
  <text x="${16 - offset}" y="24" font-family="${theme.font}" font-size="12" font-weight="700" fill="${theme.primary}" ${textStroke(theme)}>${escapeXml(label)} · 5H</text>
  <text x="${primaryValueX}" y="76" text-anchor="middle" font-family="${theme.font}" font-size="18" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${escapeXml(headline)}</text>
</svg>`;
}

function stripAnchorX(segments: number, keyWidth: number): number {
  const anchorSegment = Math.floor((segments - 1) / 2);
  return anchorSegment * keyWidth + keyWidth / 2;
}

function stripMetric(window: UsageWindow | undefined, mode: BarMode, theme: Theme, role: "primary" | "secondary") {
  if (!window) {
    return { window: undefined, width: 0, value: 0, qualifier: mode === "depleting" ? "LEFT" : "USED", color: theme[role] };
  }
  const used = Math.max(0, Math.min(100, window.usedPercent));
  const visualPercent = mode === "depleting" ? 100 - used : used;
  return {
    window,
    width: visualPercent / 100,
    value: Math.round(visualPercent),
    qualifier: mode === "depleting" ? "LEFT" : "USED",
    color: riskColor(theme, used, role)
  };
}

function bar(label: string, window: UsageWindow | undefined, mode: BarMode, y: number, theme: Theme, role: "primary" | "secondary"): string {
  if (!window) {
    return `<text x="14" y="${y + 17}" font-family="${theme.font}" font-size="12" fill="${theme.muted}" ${textStroke(theme)}>${label} —</text>`;
  }

  const used = Math.max(0, Math.min(100, window.usedPercent));
  const visualPercent = mode === "depleting" ? 100 - used : used;
  const value = Math.round(visualPercent);
  const width = 116 * (visualPercent / 100);
  const reset = formatReset(window.resetsAt);
  const fill = riskColor(theme, used, role);
  const qualifier = mode === "depleting" ? "LEFT" : "USED";

  const barRadius = Math.min(5, theme.radius);
  return `<text x="14" y="${y}" font-family="${theme.font}" font-size="10" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${label} ${qualifier}</text>
  <text x="130" y="${y}" text-anchor="end" font-family="${theme.font}" font-size="11" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${value}%</text>
  <rect x="14" y="${y + 8}" width="116" height="10" rx="${barRadius}" fill="${theme.track}" stroke="${theme.divider}" stroke-width="${theme.id === "e-ink" ? 2 : 0}"/>
  <rect x="14" y="${y + 8}" width="${width}" height="10" rx="${barRadius}" fill="${fill}"/>
  ${textureOverlay(theme, 14, y + 8, width, 10, 0.3)}
  <text x="14" y="${y + 31}" font-family="${theme.font}" font-size="9" fill="${theme.muted}" ${textStroke(theme)}>reset ${reset}</text>`;
}

function shell(label: string, theme: Theme, headline: string, detail?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">
  ${themeDefs(theme)}
  <rect width="144" height="144" rx="${theme.radius}" fill="${theme.background}"/>
  ${themeDecoration(theme, 144, 144)}
  ${textureOverlay(theme, 0, 0, 144, 144, 0.1)}
  <circle cx="20" cy="22" r="5" fill="${theme.primary}"/>
  <text x="32" y="27" font-family="${theme.font}" font-size="13" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${escapeXml(label)}</text>
  <text x="72" y="75" text-anchor="middle" font-family="${theme.font}" font-size="16" font-weight="700" fill="${theme.text}" ${textStroke(theme)}>${escapeXml(headline)}</text>
  ${detail ? `<text x="72" y="96" text-anchor="middle" font-family="${theme.font}" font-size="8" fill="${theme.muted}" ${textStroke(theme)}>${escapeXml(detail)}</text>` : ""}
</svg>`;
}

function themeDecoration(theme: Theme, width: number, height: number, offset = 0): string {
  if (theme.style !== "blocks") return "";
  return `<rect x="${width - offset - 90}" y="0" width="90" height="28" fill="${theme.secondary}"/>
  <rect x="${Math.round(width * 0.72) - offset}" y="${height - 31}" width="${Math.round(width * 0.16)}" height="31" fill="${theme.primary}"/>`;
}

function textStroke(theme: Theme, width = 2): string {
  return theme.textStroke
    ? `paint-order="stroke" stroke="${theme.textStroke}" stroke-width="${width}" stroke-linejoin="round"`
    : "";
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
