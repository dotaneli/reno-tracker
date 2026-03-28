"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface ThemeColors {
  "--bg": string;
  "--bg-elevated": string;
  "--fg": string;
  "--fg-secondary": string;
  "--fg-muted": string;
  "--accent": string;
  "--accent-soft": string;
  "--accent-hover": string;
  "--border": string;
  "--border-subtle": string;
  "--success": string;
  "--success-soft": string;
  "--alert": string;
  "--alert-soft": string;
  "--warm-glow": string;
}

export interface Theme {
  id: string;
  nameEn: string;
  nameHe: string;
  colors: ThemeColors;
}

export const themes: Theme[] = [
  {
    id: "nordic-warm",
    nameEn: "Nordic Warm",
    nameHe: "נורדי חם",
    colors: {
      "--bg": "#F5F2EE",
      "--bg-elevated": "#FFFFFF",
      "--fg": "#1A1714",
      "--fg-secondary": "#6B6460",
      "--fg-muted": "#A39E99",
      "--accent": "#B8956A",
      "--accent-soft": "#B8956A1A",
      "--accent-hover": "#A6845C",
      "--border": "#E8E3DD",
      "--border-subtle": "#F0ECE7",
      "--success": "#5E8A66",
      "--success-soft": "#5E8A6615",
      "--alert": "#C4614A",
      "--alert-soft": "#C4614A12",
      "--warm-glow": "rgba(184, 149, 106, 0.06)",
    },
  },
  {
    id: "ocean-breeze",
    nameEn: "Ocean Breeze",
    nameHe: "רוח ים",
    colors: {
      "--bg": "#F0F4F8",
      "--bg-elevated": "#FFFFFF",
      "--fg": "#1A2332",
      "--fg-secondary": "#4B5563",
      "--fg-muted": "#9CA3AF",
      "--accent": "#3B82F6",
      "--accent-soft": "#3B82F61A",
      "--accent-hover": "#2563EB",
      "--border": "#E2E8F0",
      "--border-subtle": "#EDF2F7",
      "--success": "#10B981",
      "--success-soft": "#10B98115",
      "--alert": "#EF4444",
      "--alert-soft": "#EF444412",
      "--warm-glow": "rgba(59, 130, 246, 0.06)",
    },
  },
  {
    id: "forest",
    nameEn: "Forest",
    nameHe: "יער",
    colors: {
      "--bg": "#F0F5F0",
      "--bg-elevated": "#FFFFFF",
      "--fg": "#1B2E1B",
      "--fg-secondary": "#4A6B4A",
      "--fg-muted": "#8BA68B",
      "--accent": "#059669",
      "--accent-soft": "#0596691A",
      "--accent-hover": "#047857",
      "--border": "#D5E5D5",
      "--border-subtle": "#E5F0E5",
      "--success": "#047857",
      "--success-soft": "#04785715",
      "--alert": "#DC2626",
      "--alert-soft": "#DC262612",
      "--warm-glow": "rgba(5, 150, 105, 0.06)",
    },
  },
  {
    id: "midnight",
    nameEn: "Midnight",
    nameHe: "חצות",
    colors: {
      "--bg": "#1A1A2E",
      "--bg-elevated": "#25253E",
      "--fg": "#EAEAEA",
      "--fg-secondary": "#A0A0B8",
      "--fg-muted": "#6B6B88",
      "--accent": "#E94560",
      "--accent-soft": "#E945601A",
      "--accent-hover": "#D63B55",
      "--border": "#2E2E48",
      "--border-subtle": "#232340",
      "--success": "#4ADE80",
      "--success-soft": "#4ADE8015",
      "--alert": "#FB923C",
      "--alert-soft": "#FB923C12",
      "--warm-glow": "rgba(233, 69, 96, 0.08)",
    },
  },
  {
    id: "rose-garden",
    nameEn: "Rose Garden",
    nameHe: "גן ורדים",
    colors: {
      "--bg": "#FFF1F2",
      "--bg-elevated": "#FFFFFF",
      "--fg": "#1F1315",
      "--fg-secondary": "#6B4C52",
      "--fg-muted": "#B08A90",
      "--accent": "#E11D48",
      "--accent-soft": "#E11D481A",
      "--accent-hover": "#BE123C",
      "--border": "#F5D5D9",
      "--border-subtle": "#FAE8EA",
      "--success": "#059669",
      "--success-soft": "#05966915",
      "--alert": "#EA580C",
      "--alert-soft": "#EA580C12",
      "--warm-glow": "rgba(225, 29, 72, 0.06)",
    },
  },
  {
    id: "sunset",
    nameEn: "Sunset",
    nameHe: "שקיעה",
    colors: {
      "--bg": "#FFF7ED",
      "--bg-elevated": "#FFFFFF",
      "--fg": "#1C1917",
      "--fg-secondary": "#78716C",
      "--fg-muted": "#A8A29E",
      "--accent": "#EA580C",
      "--accent-soft": "#EA580C1A",
      "--accent-hover": "#C2410C",
      "--border": "#F5E6D3",
      "--border-subtle": "#FAF0E4",
      "--success": "#16A34A",
      "--success-soft": "#16A34A15",
      "--alert": "#DC2626",
      "--alert-soft": "#DC262612",
      "--warm-glow": "rgba(234, 88, 12, 0.06)",
    },
  },
];

const STORAGE_KEY = "reno-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.colors)) {
    root.style.setProperty(prop, value);
  }
}

function clearTheme() {
  const root = document.documentElement;
  const props = Object.keys(themes[0].colors);
  for (const prop of props) {
    root.style.removeProperty(prop);
  }
}

interface ThemeContextValue {
  themeId: string;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState("nordic-warm");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && themes.some((t) => t.id === stored)) {
      setThemeId(stored);
      const theme = themes.find((t) => t.id === stored)!;
      applyTheme(theme);
    }
  }, []);

  const setTheme = useCallback((id: string) => {
    const theme = themes.find((t) => t.id === id);
    if (!theme) return;
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);
    if (id === "nordic-warm") {
      clearTheme();
    } else {
      applyTheme(theme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
