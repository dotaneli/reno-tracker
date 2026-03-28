"use client";

import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { ProjectProvider } from "@/hooks/useProject";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ProjectProvider>{children}</ProjectProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
