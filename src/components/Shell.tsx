"use client";

import { Header } from "./Header";
import { Nav } from "./Nav";
import { useApi } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  const { data: user } = useApi("/api/me");
  const { t } = useI18n();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-ping rounded-xl bg-[var(--accent)]/20" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--fg)]">
              <div className="h-4 w-4 rounded-[4px] bg-[var(--accent)]" />
            </div>
          </div>
          <span className="text-sm text-[var(--fg-muted)]">{t("general.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <Header user={user} />
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="w-full shrink-0 md:w-52">
          <Nav />
        </aside>
        <main className="flex-1 px-4 py-5 md:px-8 md:py-8 lg:px-12">{children}</main>
      </div>
    </div>
  );
}
