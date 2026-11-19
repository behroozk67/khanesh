import { getSync, setSync } from "./theme-store";

export type Mode = "dark" | "light";

// Dark follows the Ultrahuman look (near-black, green accent); light follows the site's tests page
// (warm cream page, white cards, the site's ink/line/track tokens). `good`/`warn`/`bad` are clinical status colours; `hero`/`heroCta` are the site's landing hero, the same in both modes.
export const PALETTES = {
  dark: {
    bg: "#0B0F14", card: "#151C24", ink: "#F8FAFC", muted: "#94A3B8", line: "#232E3C", track: "#232E3C", fab: "#3A3A42",
    brand: "#10B981", brandSoft: "#0D2E26", good: "#34C98A", warn: "#E9A23B", bad: "#F06A6A", badSoft: "#3A1717",
    hero: "#073B30", heroCta: "#F2501A",
    surface: "#0B0F14", hair: "#1C2530", chip: "#1C2530", chipInk: "#CBD5E1", brandTint: "#0D2E26", brandInk: "#34D399", noteBg: "#2A2112", noteInk: "#E9A23B",
    bar: "#151C24", barLine: "#232E3C", barInk: "#CBD5E1", barActive: "#34D399", barCapsule: "#0D2E26",
    brandLine: "#134E3A", emerald: "#34D399", amber: "#FBBF24", gold: "#FACC15", faint: "#475569", subtle: "#64748B",
    heroA: "#0B4F45", heroB: "#0F766E",
    amberSoft: "#3A2A10",
  },
  light: {
    bg: "#FAF7F0", card: "#FFFFFF", ink: "#16202C", muted: "#5B6572", line: "#E6E3DC", track: "#EEF0F3", fab: "#FFFFFF",
    brand: "#0A8F78", brandSoft: "#DDF3EE", good: "#1F6B45", warn: "#B7791F", bad: "#B3261E", badSoft: "#FDECEA",
    hero: "#073B30", heroCta: "#F2501A",
    // Profile page's slate look (surface/chips/notes); the rest of the app keeps the cream `bg`.
    surface: "#F8FAFC", hair: "#F1F5F9", chip: "#F1F5F9", chipInk: "#334155", brandTint: "#ECFDF5", brandInk: "#0F766E", noteBg: "#FFFBEB", noteInk: "#B45309",
    // Bottom tab bar: white with a clear top line, dark-grey inactive, brand-green active in a soft capsule.
    bar: "#FFFFFF", barLine: "#E2E8F0", barInk: "#475569", barActive: "#0D9488", barCapsule: "#CCFBF1",
    // Challenges: stat icons (consistency/streak/trophy), idle heart, footnote.
    brandLine: "#D1FAE5", emerald: "#10B981", amber: "#F59E0B", gold: "#EAB308", faint: "#CBD5E1", subtle: "#94A3B8",
    // Home: the analyse card's gradient (white text on it in both modes).
    heroA: "#0F766E", heroB: "#0D9488",
    // Result: out-of-range value badge (text is noteInk).
    amberSoft: "#FEF3C7",
  },
};

const KEY = "azmayar_theme";

/** Read synchronously at startup: styles are built once at import, so changing the mode reloads the app. */
function read(): Mode {
  try {
    return getSync(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export const mode: Mode = read();

export function saveMode(m: Mode) {
  try {
    setSync(KEY, m);
  } catch {
    // stays on the current mode
  }
}
