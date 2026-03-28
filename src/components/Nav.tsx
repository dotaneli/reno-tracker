"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type TKey } from "@/lib/i18n";
import {
  LayoutDashboard,
  ListTodo,
  Users,
  AlertTriangle,
  Truck,
  Home,
  Receipt,
  History,
  FolderKanban,
  Tags,
  Plug,
  type LucideIcon,
} from "lucide-react";

const links: { href: string; label: TKey; icon: LucideIcon }[] = [
  { href: "/", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "nav.projects", icon: FolderKanban },
  { href: "/tasks", label: "nav.tasks", icon: ListTodo },
  { href: "/costs", label: "nav.costs", icon: Receipt },
  { href: "/vendors", label: "nav.vendors", icon: Truck },
  { href: "/categories", label: "cat.title", icon: Tags },
  { href: "/property", label: "nav.property", icon: Home },
  { href: "/issues", label: "nav.issues", icon: AlertTriangle },
  { href: "/history", label: "nav.history", icon: History },
  { href: "/team", label: "nav.team", icon: Users },
  { href: "/integrations", label: "nav.integrations", icon: Plug },
];

export function Nav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="flex gap-1 overflow-x-auto bg-[var(--bg-elevated)] px-3 py-2 md:flex-col md:border-e md:border-[var(--border-subtle)] md:px-3 md:py-6">
      <div className="hidden px-3 pb-4 md:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
          {t("nav.dashboard")}
        </p>
      </div>
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`lift group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-150 ${
              active
                ? "bg-[var(--fg)] font-medium text-[var(--bg-elevated)] shadow-md"
                : "text-[var(--fg-secondary)] hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]"
            }`}
          >
            <Icon size={17} strokeWidth={active ? 2 : 1.5} />
            <span className="whitespace-nowrap">{t(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
