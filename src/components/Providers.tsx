"use client";

import { I18nProvider } from "@/lib/i18n";
import { ProjectProvider } from "@/hooks/useProject";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ProjectProvider>{children}</ProjectProvider>
    </I18nProvider>
  );
}
