"use client";

import { useI18n } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "he" : "en")}
      className="relative flex h-8 w-[60px] items-center rounded-full bg-[var(--fg)]/8 p-0.5 transition-all hover:bg-[var(--fg)]/12"
      aria-label={t("general.toggleLanguage")}
    >
      <span
        className={`absolute h-7 w-7 rounded-full bg-[var(--bg-elevated)] shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-out ${
          lang === "he" ? "translate-x-[30px]" : "translate-x-0"
        }`}
      />
      <span className="relative z-10 flex w-full justify-between px-2 text-[10px] font-bold tracking-wide text-[var(--fg-muted)]">
        <span className={lang === "en" ? "text-[var(--fg)]" : ""}>EN</span>
        <span className={lang === "he" ? "text-[var(--fg)]" : ""}>HE</span>
      </span>
    </button>
  );
}
