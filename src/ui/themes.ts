import type { ThemeId } from "../config/bar-settings.js";

export type ThemeStyle =
  | "clean"
  | "matte"
  | "bubbles"
  | "waves"
  | "veins"
  | "embers"
  | "crystal"
  | "scanlines"
  | "grid"
  | "hazard"
  | "blocks";

export type Theme = {
  id: ThemeId;
  label: string;
  style: ThemeStyle;
  background: string;
  surface: string;
  track: string;
  primary: string;
  secondary: string;
  text: string;
  muted: string;
  warning: string;
  danger: string;
  badge: string;
  divider: string;
  radius: number;
  font: string;
  textStroke?: string;
};

const THEMES: Record<ThemeId, Theme> = {
  harness: {
    id: "harness", label: "Harness", style: "clean",
    background: "#111318", surface: "#292d35", track: "#30343d",
    primary: "#76e6a6", secondary: "#8fb5ff", text: "#ffffff", muted: "#7f8795",
    warning: "#ffca66", danger: "#ff6b6b", badge: "#ffca66", divider: "#111318", radius: 24,
    font: "Arial,sans-serif"
  },
  ravena: {
    id: "ravena", label: "Ravena", style: "matte",
    background: "#0c0a0f", surface: "#29252e", track: "#45404b",
    primary: "#76558d", secondary: "#a59daa", text: "#f2edf4", muted: "#aaa1ae",
    warning: "#b78f57", danger: "#9e465d", badge: "#b59bc7", divider: "#17121c", radius: 18,
    font: "Arial,sans-serif"
  },
  glob: {
    id: "glob", label: "Glob", style: "bubbles",
    background: "#10170a", surface: "#314328", track: "#53634a",
    primary: "#b5f23f", secondary: "#789b3a", text: "#f4ffe1", muted: "#a9bd8d",
    warning: "#e2c841", danger: "#d66736", badge: "#c8ff62", divider: "#1b2712", radius: 30,
    font: "Arial Rounded MT Bold,Arial,sans-serif"
  },
  kraken: {
    id: "kraken", label: "Kraken", style: "waves",
    background: "#06141d", surface: "#0d3040", track: "#174b5e",
    primary: "#17d7c5", secondary: "#4897ba", text: "#e8ffff", muted: "#81afbd",
    warning: "#d5b857", danger: "#ed5a71", badge: "#5ef3e4", divider: "#041018", radius: 22,
    font: "Arial,sans-serif"
  },
  aurix: {
    id: "aurix", label: "Aurix", style: "veins",
    background: "#15120b", surface: "#373024", track: "#554a32",
    primary: "#f1b83c", secondary: "#d77824", text: "#fff6d7", muted: "#b9a779",
    warning: "#fff06a", danger: "#ff6844", badge: "#ffd86b", divider: "#211a0d", radius: 14,
    font: "Arial,sans-serif"
  },
  fornalha: {
    id: "fornalha", label: "Fornalha", style: "embers",
    background: "#160907", surface: "#3a1710", track: "#5a2418",
    primary: "#ff762b", secondary: "#d63b1f", text: "#fff0dc", muted: "#c39172",
    warning: "#ffbb33", danger: "#ff352b", badge: "#ff9c47", divider: "#210b08", radius: 12,
    font: "Arial,sans-serif"
  },
  cryo: {
    id: "cryo", label: "Cryo", style: "crystal",
    background: "#071525", surface: "#16334a", track: "#28536e",
    primary: "#9ae7ff", secondary: "#5f9fe8", text: "#f2fcff", muted: "#9bbdca",
    warning: "#f4d06f", danger: "#ff7185", badge: "#c8f3ff", divider: "#071827", radius: 16,
    font: "Arial,sans-serif"
  },
  terminal: {
    id: "terminal", label: "Terminal", style: "scanlines",
    background: "#020702", surface: "#071408", track: "#17351a",
    primary: "#48ff62", secondary: "#1fb43c", text: "#74ff83", muted: "#4b9255",
    warning: "#d6ff45", danger: "#ff5f56", badge: "#74ff83", divider: "#000000", radius: 2,
    font: "Consolas,monospace"
  },
  synthwave: {
    id: "synthwave", label: "Synthwave", style: "grid",
    background: "#100526", surface: "#27104a", track: "#43206d",
    primary: "#ff3fcf", secondary: "#27d9ff", text: "#fff1ff", muted: "#b792d0",
    warning: "#ffe44d", danger: "#ff476f", badge: "#59e7ff", divider: "#14072d", radius: 20,
    font: "Arial,sans-serif"
  },
  "alerta-carmesim": {
    id: "alerta-carmesim", label: "Alerta Carmesim", style: "hazard",
    background: "#120405", surface: "#351012", track: "#56191d",
    primary: "#dc2638", secondary: "#f0a22e", text: "#fff0e8", muted: "#c78d86",
    warning: "#ffb22e", danger: "#ff3045", badge: "#ffb22e", divider: "#1d0709", radius: 8,
    font: "Arial,sans-serif"
  },
  "e-ink": {
    id: "e-ink", label: "E-Ink", style: "blocks",
    background: "#f3ead2", surface: "#f3ead2", track: "#f3ead2",
    primary: "#cf2f24", secondary: "#e9b925", text: "#cf2f24", muted: "#cf2f24",
    warning: "#e9b925", danger: "#cf2f24", badge: "#e9b925", divider: "#cf2f24", radius: 0,
    font: "Arial Black,Arial,sans-serif", textStroke: "#f3ead2"
  }
};

export function getTheme(id: ThemeId): Theme {
  return THEMES[id];
}

export function providerTheme(theme: Theme, providerAccent: string): Theme {
  return theme.id === "harness" ? { ...theme, primary: providerAccent, secondary: providerAccent } : theme;
}

export function riskColor(theme: Theme, usedPercent: number, role: "primary" | "secondary"): string {
  if (usedPercent >= 90) return theme.danger;
  if (usedPercent >= 75) return theme.warning;
  return theme[role];
}

export function themeDefs(theme: Theme): string {
  const texture = texturePattern(theme);
  return texture ? `<defs>${texture}</defs>` : "";
}

export function textureOverlay(theme: Theme, x: number, y: number, width: number, height: number, opacity = 0.22): string {
  if (theme.style === "clean" || theme.style === "blocks") return "";
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#theme-texture)" opacity="${opacity}" pointer-events="none"/>`;
}

function texturePattern(theme: Theme): string {
  switch (theme.style) {
    case "matte":
      return `<pattern id="theme-texture" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M-4 18L18-4M5 23L23 5" stroke="${theme.secondary}" stroke-width="1"/></pattern>`;
    case "bubbles":
      return `<pattern id="theme-texture" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="6" cy="7" r="3" fill="none" stroke="${theme.text}" stroke-width="1.4"/><circle cx="18" cy="17" r="5" fill="none" stroke="${theme.text}" stroke-width="1"/></pattern>`;
    case "waves":
      return `<pattern id="theme-texture" width="36" height="18" patternUnits="userSpaceOnUse"><path d="M-9 9 Q0 0 9 9T27 9T45 9" fill="none" stroke="${theme.text}" stroke-width="1.5"/></pattern>`;
    case "veins":
      return `<pattern id="theme-texture" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M0 30L10 21L16 24L25 10L36 4M16 24L20 35M25 10L31 18" fill="none" stroke="${theme.text}" stroke-width="1.2"/></pattern>`;
    case "embers":
      return `<pattern id="theme-texture" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="5" cy="18" r="1.5" fill="${theme.text}"/><circle cx="16" cy="8" r="1" fill="${theme.warning}"/><path d="M9 24Q14 16 11 10" fill="none" stroke="${theme.text}"/></pattern>`;
    case "crystal":
      return `<pattern id="theme-texture" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M0 6L13 15L8 28M13 15L28 8L36 17M13 15L24 29" fill="none" stroke="${theme.text}" stroke-width="1"/></pattern>`;
    case "scanlines":
      return `<pattern id="theme-texture" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="${theme.text}"/></pattern>`;
    case "grid":
      return `<pattern id="theme-texture" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="${theme.secondary}" stroke-width="1"/></pattern>`;
    case "hazard":
      return `<pattern id="theme-texture" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="9" height="24" fill="${theme.secondary}"/></pattern>`;
    default:
      return "";
  }
}
