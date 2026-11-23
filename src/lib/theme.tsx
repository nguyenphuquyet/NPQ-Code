import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeId = "light" | "dark" | "hc" | "solarized";

/**
 * Theme catalogue. The actual colours live in `src/index.css` (`:root[data-theme]`
 * blocks); `preview` is only the little strip shown in the Settings dialog.
 */
export const THEMES: {
  id: ThemeId;
  preview: { background: string; sidebar: string; accent: string };
}[] = [
  {
    id: "light",
    preview: { background: "#FFFFFF", sidebar: "#F3F3F3", accent: "#007ACC" },
  },
  {
    id: "dark",
    preview: { background: "#1E1E1E", sidebar: "#252526", accent: "#007ACC" },
  },
  {
    id: "hc",
    preview: { background: "#000000", sidebar: "#000000", accent: "#6FC3DF" },
  },
  {
    id: "solarized",
    preview: { background: "#FDF6E3", sidebar: "#EEE8D5", accent: "#268BD2" },
  },
];

const DARK_THEMES = new Set<ThemeId>(["dark", "hc"]);
const STORAGE_KEY = "npqcode.theme";

function isThemeId(value: string | null): value is ThemeId {
  return value !== null && THEMES.some((theme) => theme.id === value);
}

function readStoredTheme(): ThemeId {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isThemeId(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return "light";
}

function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  // Keeps native widgets (inputs, scrollbars, caret) in the matching mode.
  root.style.colorScheme = DARK_THEMES.has(theme) ? "dark" : "light";
}

// Apply before React paints so a saved dark theme never flashes light.
if (typeof document !== "undefined") applyTheme(readStoredTheme());

type ThemeValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeValue>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>");
  return value;
}
