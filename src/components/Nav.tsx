"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type TKey } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import {
  LayoutDashboard, ListTodo, Users, AlertTriangle, Truck, Home,
  Receipt, History, FolderKanban, Tags, Plug,
  FileSpreadsheet, FileText, MessageCircle, Image, Check,
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
  const { activeProject } = useProject();
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const projectId = activeProject?.id;

  const download = async (format: string, ext: string) => {
    if (!projectId) return;
    setLoading(format);
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setLoading(null);
  };

  const shareWhatsApp = async () => {
    if (!projectId) return;
    setLoading("whatsapp");
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=whatsapp`);
      const data = await res.json();
      if (navigator.share) await navigator.share({ text: data.text });
      else window.open(data.shareUrl, "_blank");
    } catch {}
    setLoading(null);
  };

  const captureScreenshot = async () => {
    setLoading("png");
    try {
      const main = document.querySelector("main");
      if (!main) return;
      // Dynamic import html2canvas only when needed
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(main as HTMLElement, { backgroundColor: "#F5F2EE", scale: 2 });
      // Copy to clipboard
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setCopied("png");
            setTimeout(() => setCopied(null), 2000);
          } catch {
            // Fallback: download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "report.png"; a.click();
            URL.revokeObjectURL(url);
          }
        }
      }, "image/png");
    } catch {}
    setLoading(null);
  };

  const shareBtn = "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium text-[var(--fg-secondary)] transition-all hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]";

  return (
    <nav className="flex gap-1 overflow-x-auto bg-[var(--bg-elevated)] px-3 py-2 md:flex-col md:justify-between md:border-e md:border-[var(--border-subtle)] md:px-3 md:py-6 md:min-h-[calc(100vh-64px)]">
      <div className="flex gap-1 md:flex-col md:gap-1">
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
      </div>

      {/* Share/Export — bottom of sidebar, project-level */}
      {projectId && (
        <div className="hidden md:block border-t border-[var(--border-subtle)] pt-3 mt-3">
          <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
            {t("export.title")}
          </p>
          <button onClick={() => download("csv", "csv")} disabled={loading === "csv"} className={shareBtn}>
            <FileSpreadsheet size={14} className="text-[#0F9D58]" />
            {loading === "csv" ? "..." : t("export.sheets")}
          </button>
          <button onClick={() => download("html", "html")} disabled={loading === "html"} className={shareBtn}>
            <FileText size={14} className="text-[#4285F4]" />
            {loading === "html" ? "..." : t("export.docs")}
          </button>
          <button onClick={shareWhatsApp} disabled={loading === "whatsapp"} className={shareBtn}>
            <MessageCircle size={14} className="text-[#25D366]" />
            {loading === "whatsapp" ? "..." : t("export.whatsapp")}
          </button>
          <button onClick={captureScreenshot} disabled={loading === "png"} className={shareBtn}>
            <Image size={14} className="text-[var(--accent)]" />
            {copied === "png" ? <><Check size={12} className="text-[var(--success)]" /> {t("export.pngCopied")}</> : loading === "png" ? "..." : t("export.png")}
          </button>
        </div>
      )}
    </nav>
  );
}
