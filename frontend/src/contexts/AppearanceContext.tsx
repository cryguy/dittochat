import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';

/**
 * Client-only appearance system. Mirrors the three controls the Storyforge
 * design ships (narrative voice / reading density / accent mood) and drives
 * them entirely through CSS custom properties written onto :root. Nothing here
 * touches the backend — preferences live in localStorage.
 */

export type Voice = 'Literary' | 'Modern' | 'Typewriter';
export type Density = 'Cozy' | 'Comfortable' | 'Spacious';
export type Accent = 'Native' | 'Ember' | 'Violet' | 'Aqua' | 'Rose';

export interface Appearance {
  voice: Voice;
  density: Density;
  accent: Accent;
}

export const VOICE_OPTIONS: Voice[] = ['Literary', 'Modern', 'Typewriter'];
export const DENSITY_OPTIONS: Density[] = ['Cozy', 'Comfortable', 'Spacious'];
export const ACCENT_OPTIONS: Accent[] = ['Native', 'Ember', 'Violet', 'Aqua', 'Rose'];

const DEFAULTS: Appearance = {
  voice: 'Literary',
  density: 'Comfortable',
  accent: 'Native',
};

const STORAGE_KEY = 'dittochat.appearance';

// Narrative voice → prose font stack (applied to assistant prose only).
const VOICE_FONTS: Record<Voice, string> = {
  Literary: "'Newsreader Variable', Georgia, 'Times New Roman', serif",
  Modern: "'Instrument Sans Variable', -apple-system, BlinkMacSystemFont, sans-serif",
  Typewriter: "'JetBrains Mono Variable', 'SF Mono', Monaco, monospace",
};

// Reading density → prose scale multiplier.
const DENSITY_SCALES: Record<Density, number> = {
  Cozy: 0.9,
  Comfortable: 1,
  Spacious: 1.16,
};

// Accent mood → filled/hover/soft. `Native` intentionally omitted: it keeps the
// :root default violet. Values are mid-tone and saturated so light text reads on
// top of a filled swatch.
const ACCENT_COLORS: Record<
  Exclude<Accent, 'Native'>,
  { base: string; hover: string; soft: string }
> = {
  Ember: { base: 'oklch(0.62 0.19 42)', hover: 'oklch(0.56 0.19 42)', soft: 'oklch(0.70 0.15 42)' },
  Violet: { base: 'oklch(0.58 0.22 292)', hover: 'oklch(0.52 0.22 292)', soft: 'oklch(0.68 0.16 292)' },
  Aqua: { base: 'oklch(0.62 0.13 205)', hover: 'oklch(0.56 0.13 205)', soft: 'oklch(0.70 0.11 205)' },
  Rose: { base: 'oklch(0.60 0.22 8)', hover: 'oklch(0.54 0.22 8)', soft: 'oklch(0.70 0.16 8)' },
};

interface AppearanceContextType extends Appearance {
  setVoice: (v: Voice) => void;
  setDensity: (d: Density) => void;
  setAccent: (a: Accent) => void;
}

const AppearanceContext = createContext<AppearanceContextType | null>(null);

function loadAppearance(): Appearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    return {
      voice: VOICE_OPTIONS.includes(parsed.voice as Voice) ? (parsed.voice as Voice) : DEFAULTS.voice,
      density: DENSITY_OPTIONS.includes(parsed.density as Density)
        ? (parsed.density as Density)
        : DEFAULTS.density,
      accent: ACCENT_OPTIONS.includes(parsed.accent as Accent)
        ? (parsed.accent as Accent)
        : DEFAULTS.accent,
    };
  } catch {
    return DEFAULTS;
  }
}

function applyAppearance(a: Appearance): void {
  const root = document.documentElement;
  root.style.setProperty('--prose-font', VOICE_FONTS[a.voice]);
  root.style.setProperty('--prose-scale', String(DENSITY_SCALES[a.density]));

  if (a.accent === 'Native') {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-hover');
    root.style.removeProperty('--accent-soft');
    return;
  }
  const c = ACCENT_COLORS[a.accent];
  root.style.setProperty('--accent', c.base);
  root.style.setProperty('--accent-hover', c.hover);
  root.style.setProperty('--accent-soft', c.soft);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance);

  // useLayoutEffect so the vars are written before the browser paints — no
  // flash of the default look when a non-default preference is restored.
  useLayoutEffect(() => {
    applyAppearance(appearance);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    } catch {
      /* localStorage may be unavailable (private mode / quota) — non-fatal */
    }
  }, [appearance]);

  const value: AppearanceContextType = {
    ...appearance,
    setVoice: (voice) => setAppearance((p) => ({ ...p, voice })),
    setDensity: (density) => setAppearance((p) => ({ ...p, density })),
    setAccent: (accent) => setAppearance((p) => ({ ...p, accent })),
  };

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used within an AppearanceProvider');
  return ctx;
}
