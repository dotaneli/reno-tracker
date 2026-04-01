---
name: add-ui-component
description: Create a new UI component following the project's v1/v2 versioning pattern, i18n, and design system
user_invocable: true
---

# Add UI Component

Create a new component following project conventions.

## Rules

1. **i18n mandatory** — every UI string must use `t("key")` from `src/lib/i18n.tsx` with both EN and HE translations. Never hardcode English.
2. **"use client"** directive required for all interactive components
3. **Design system** — use CSS variables: `var(--fg)`, `var(--bg)`, `var(--accent)`, `var(--border)`, `var(--alert)`, `var(--success)`, etc. Use Tailwind utilities.
4. **Icons** — use `lucide-react` for all icons
5. **Data fetching** — use `useApi` hook (SWR-based) for GET, `apiPatch`/`apiDelete` for mutations
6. **After mutations** — always call `mutateAll()` or `onMutate()` to refresh SWR caches

## If the component differs between v1 and v2

Create three files:
- `src/components/MyComponent.v1.tsx` — v1 version
- `src/components/MyComponent.v2.tsx` — v2 version
- `src/components/MyComponent.tsx` — selector:

```tsx
"use client";
import dynamic from "next/dynamic";
export const MyComponent = dynamic(
  () => process.env.NEXT_PUBLIC_UI_VERSION === "v2"
    ? import("./MyComponent.v2").then(m => ({ default: m.MyComponent }))
    : import("./MyComponent.v1").then(m => ({ default: m.MyComponent })),
);
```

## If the component is the same for both versions

Just create `src/components/MyComponent.tsx` — no versioning needed.
