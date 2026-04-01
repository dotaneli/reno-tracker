---
name: add-page
description: Create a new dashboard page following the project's layout, i18n, auth, and v1/v2 versioning patterns
user_invocable: true
---

# Add Dashboard Page

Create a new page under the `(dashboard)` route group.

## Pattern

```typescript
"use client";

import { useProject } from "@/hooks/useProject";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/Card";

export default function MyPage() {
  const { t, lang } = useI18n();
  const { activeProject: project, loading } = useProject();

  if (!project) {
    if (loading) return <div className="flex h-64 items-center justify-center text-[var(--fg-muted)]">{t("general.loading")}</div>;
    return <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
      <p>{t("proj.noProjects")}</p>
      <a href="/projects" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">{t("proj.create")}</a>
    </div>;
  }

  return <div className="mx-auto max-w-5xl space-y-6">...</div>;
}
```

## Rules

1. **i18n** — add all new strings to `src/lib/i18n.tsx` dict with EN + HE translations
2. **No-project guard** — always handle the case where `project` is null (show loading or create prompt)
3. **Navigation** — add the page to `src/components/Nav.v1.tsx` AND `Nav.v2.tsx`
4. **CSS variables** — use the design system, never hardcode colors
5. **If page differs between v1/v2** — create `page.v1.tsx`, `page.v2.tsx`, and selector `page.tsx` using `next/dynamic`
