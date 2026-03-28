"use client";

import { useI18n, type TKey } from "@/lib/i18n";
import { useTheme, themes } from "@/lib/theme";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const { t, lang } = useI18n();
  const { themeId, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--fg)]">
        {t("settings.title")}
      </h1>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        {t("settings.themeDesc")}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {themes.map((theme) => {
          const active = theme.id === themeId;
          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`lift group relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-4 transition-all ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-md"
                  : "border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--fg-muted)]"
              }`}
            >
              {/* Color swatch */}
              <div
                className="relative h-14 w-14 rounded-xl shadow-sm"
                style={{ background: theme.colors["--bg"] }}
              >
                {/* Accent circle */}
                <div
                  className="absolute bottom-0 end-0 h-6 w-6 rounded-full border-2 shadow-sm"
                  style={{
                    background: theme.colors["--accent"],
                    borderColor: theme.colors["--bg"],
                  }}
                />
                {/* Foreground bar */}
                <div
                  className="absolute start-2 top-2 h-1.5 w-6 rounded-full"
                  style={{ background: theme.colors["--fg"] }}
                />
                <div
                  className="absolute start-2 top-5 h-1 w-4 rounded-full opacity-50"
                  style={{ background: theme.colors["--fg-secondary"] }}
                />
                {/* Check overlay */}
                {active && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20">
                    <Check size={22} className="text-white drop-shadow" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Theme name */}
              <span className="text-xs font-medium text-[var(--fg)]">
                {lang === "he" ? theme.nameHe : theme.nameEn}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
