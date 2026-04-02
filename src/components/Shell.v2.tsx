"use client";

import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Nav } from "./Nav";
import { AiChat } from "./AiChat";
import { useApi } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  const { data: user, error, isLoading } = useApi("/api/me");
  const { t } = useI18n();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // Redirect to login if auth fails (401/403) or times out
  useEffect(() => {
    if ((error && !isLoading) || timedOut) {
      router.replace("/login");
    }
  }, [error, isLoading, timedOut, router]);

  // Timeout: if still loading after 8 seconds, redirect to login
  useEffect(() => {
    if (user) return;
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [user]);

  if (isLoading || (!user && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-ping rounded-xl bg-[var(--accent)]/20" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]">
              <div className="h-4 w-4 rounded-[4px] bg-white" />
            </div>
          </div>
          <span className="text-sm text-[var(--fg-muted)]">{t("general.loading")}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // Error state — redirect is happening
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <Header user={user} />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <Nav />
        {/* Main content — pb-20 on mobile for bottom tab bar clearance */}
        <main className="flex-1 px-4 py-5 pb-20 md:px-8 md:py-8 md:pb-8 lg:px-12">
          {children}
        </main>
      </div>
      <AiChat />
    </div>
  );
}
