"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type TKey } from "@/lib/i18n";
import { useApi } from "@/hooks/useApi";
import {
  Home, ListTodo, Truck, Tags, House,
  AlertTriangle, History, Users, Plug, Settings, Shield,
  Plus, MoreHorizontal, FolderOpen, X,
  type LucideIcon,
} from "lucide-react";

// ── Sidebar section definitions ──

interface NavItem {
  href: string;
  label: TKey;
  icon: LucideIcon;
}

interface NavSection {
  title: TKey;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "nav.sectionMain",
    items: [
      { href: "/", label: "nav.home", icon: Home },
      { href: "/tasks", label: "nav.tasks", icon: ListTodo },
    ],
  },
  {
    title: "nav.sectionDirectory",
    items: [
      { href: "/vendors", label: "nav.vendors", icon: Truck },
      { href: "/categories", label: "cat.title", icon: Tags },
      { href: "/property", label: "nav.property", icon: House },
    ],
  },
  {
    title: "nav.sectionTrack",
    items: [
      { href: "/issues", label: "nav.issues", icon: AlertTriangle },
      { href: "/history", label: "nav.history", icon: History },
    ],
  },
  {
    title: "nav.sectionManage",
    items: [
      { href: "/team", label: "nav.team", icon: Users },
      { href: "/integrations", label: "nav.integrations", icon: Plug },
      { href: "/settings", label: "nav.settings", icon: Settings },
    ],
  },
];

const adminItem: NavItem = { href: "/admin", label: "nav.admin", icon: Shield };

// ── Mobile bottom tab definitions ──

const mobileTabs: NavItem[] = [
  { href: "/", label: "nav.home", icon: Home },
  { href: "/tasks", label: "nav.tasks", icon: ListTodo },
];

const directoryItems: NavItem[] = [
  { href: "/vendors", label: "nav.vendors", icon: Truck },
  { href: "/categories", label: "cat.title", icon: Tags },
  { href: "/property", label: "nav.property", icon: House },
];

const moreItems: NavItem[] = [
  { href: "/issues", label: "nav.issues", icon: AlertTriangle },
  { href: "/history", label: "nav.history", icon: History },
  { href: "/team", label: "nav.team", icon: Users },
  { href: "/integrations", label: "nav.integrations", icon: Plug },
  { href: "/settings", label: "nav.settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { data: me } = useApi<any>("/api/me");
  const isAdmin = me?.isAdmin === true;

  // Mobile popover state
  const [mobilePopover, setMobilePopover] = useState<"directory" | "more" | null>(null);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isDirectoryActive = directoryItems.some((i) => isActive(i.href));
  const isMoreActive = moreItems.some((i) => isActive(i.href)) || (isAdmin && isActive("/admin"));

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav className="hidden md:flex flex-col gap-1 w-[200px] bg-[var(--bg-elevated)] border-e border-[var(--border-subtle)] px-3 py-4 h-[calc(100vh-56px)] sticky top-14 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-3" : ""}>
            <p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              {t(section.title)}
            </p>
            {section.items.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-all duration-100 ${
                    active
                      ? "font-semibold text-[var(--fg)]"
                      : "text-[var(--fg-secondary)] hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]"
                  }`}
                >
                  <span className={`flex h-3.5 w-3.5 items-center justify-center`}>
                    {active ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                    ) : (
                      <span className="h-2 w-2 rounded-full border border-[var(--border)]" />
                    )}
                  </span>
                  {t(label)}
                </Link>
              );
            })}
            {/* Admin link in manage section */}
            {section.title === "nav.sectionManage" && isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-all duration-100 ${
                  isActive("/admin")
                    ? "font-semibold text-[var(--fg)]"
                    : "text-[var(--fg-secondary)] hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]"
                }`}
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center">
                  {isActive("/admin") ? (
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  ) : (
                    <span className="h-2 w-2 rounded-full border border-[var(--border)]" />
                  )}
                </span>
                {t("nav.admin")}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 backdrop-blur-xl">
        <div className="flex h-14 items-end justify-around px-2 pb-1">
          {/* Home */}
          {mobileTabs.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-all ${
                  active ? "text-[var(--accent)]" : "text-[var(--fg-muted)]"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                <span className="text-[9px] font-medium">{t(label)}</span>
              </Link>
            );
          })}

          {/* Add button — raised accent circle */}
          <Link
            href="/tasks?add=1"
            className="flex flex-col items-center gap-0.5 -mt-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/25 transition-transform active:scale-95">
              <Plus size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-medium text-[var(--fg-muted)]">{t("nav.add")}</span>
          </Link>

          {/* Directory */}
          <button
            onClick={() => setMobilePopover(mobilePopover === "directory" ? null : "directory")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-all ${
              isDirectoryActive || mobilePopover === "directory" ? "text-[var(--accent)]" : "text-[var(--fg-muted)]"
            }`}
          >
            <FolderOpen size={20} strokeWidth={isDirectoryActive ? 2 : 1.5} />
            <span className="text-[9px] font-medium">{t("nav.directory")}</span>
          </button>

          {/* More */}
          <button
            onClick={() => setMobilePopover(mobilePopover === "more" ? null : "more")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-all ${
              isMoreActive || mobilePopover === "more" ? "text-[var(--accent)]" : "text-[var(--fg-muted)]"
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2 : 1.5} />
            <span className="text-[9px] font-medium">{t("nav.more")}</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Popover (Directory / More) ── */}
      {mobilePopover && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobilePopover(null)} />
          <div className="absolute bottom-14 inset-x-0 rounded-t-2xl border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 pb-4 animate-[slideUp_0.15s_ease-out]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[12px] font-semibold text-[var(--fg)]">
                {mobilePopover === "directory" ? t("nav.directory") : t("nav.more")}
              </span>
              <button
                onClick={() => setMobilePopover(null)}
                className="rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(mobilePopover === "directory" ? directoryItems : [
                ...moreItems,
                ...(isAdmin ? [adminItem] : []),
              ]).map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobilePopover(null)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all ${
                      active
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "text-[var(--fg-secondary)] hover:bg-[var(--warm-glow)]"
                    }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                    <span className="text-[10px] font-medium text-center">{t(label)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
