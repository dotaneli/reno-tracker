"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type TKey } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import {
  LayoutDashboard, ListTodo, Users, AlertTriangle, Truck, Home,
  Receipt, History, FolderKanban, Tags, Plug, Settings, Shield,
  FileSpreadsheet, FileText, MessageCircle, Image, Download, Copy, Check,
  type LucideIcon,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";

const baseLinks: { href: string; label: TKey; icon: LucideIcon }[] = [
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
  { href: "/settings", label: "nav.settings", icon: Settings },
];

const adminLink = { href: "/admin", label: "nav.admin" as TKey, icon: Shield };

export function Nav() {
  const pathname = usePathname();
  const { t, lang } = useI18n();
  const { activeProject } = useProject();
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data: me } = useApi<any>("/api/me");
  const isAdmin = me?.isAdmin === true;
  const links = isAdmin ? [...baseLinks, adminLink] : baseLinks;

  const projectId = activeProject?.id;

  const flash = (key: string) => { setDone(key); setTimeout(() => setDone(null), 2000); };

  // ── Download file from export API ──
  const downloadFile = async (format: string, ext: string) => {
    if (!projectId) return;
    setLoading(format);
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject?.name || "report"}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      flash(format);
    } catch {}
    setLoading(null);
  };

  // ── WhatsApp: try native share first, fallback to wa.me ──
  const shareWhatsApp = async () => {
    if (!projectId) return;
    setLoading("whatsapp");
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=whatsapp&lang=${lang}`);
      const data = await res.json();
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text: data.text });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(data.text)}`, "_blank");
      }
      flash("whatsapp");
    } catch {}
    setLoading(null);
  };

  // ── Google Sheets: create in user's Drive ──
  const exportToSheets = async () => {
    if (!projectId) return;
    setLoading("sheets");
    try {
      const res = await fetch(`/api/projects/${projectId}/export-sheets?lang=${lang}`, { method: "POST" });
      const data = await res.json();
      if (data.url) { window.open(data.url, "_blank"); flash("sheets"); }
      else if (data.error === "google_auth_required") { alert("Please sign out and sign back in to grant Google Drive access."); }
    } catch {}
    setLoading(null);
  };

  // ── Google Docs: create in user's Drive ──
  const exportToDocs = async () => {
    if (!projectId) return;
    setLoading("docs");
    try {
      const res = await fetch(`/api/projects/${projectId}/export-docs?lang=${lang}`, { method: "POST" });
      const data = await res.json();
      if (data.url) { window.open(data.url, "_blank"); flash("docs"); }
      else if (data.error === "google_auth_required") { alert("Please sign out and sign back in to grant Google Drive access."); }
    } catch {}
    setLoading(null);
  };

  // ── Infographic: generate and offer download or clipboard ──
  const generateInfographic = async (action: "copy" | "download") => {
    if (!projectId) return;
    setLoading("image");
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=infographic&lang=${lang}`);
      const svgText = await res.text();
      // Render SVG to canvas
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d")!;
      const img = new window.Image();
      img.onload = async () => {
        ctx.drawImage(img, 0, 0);
        if (action === "copy") {
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                flash("copy");
              } catch {
                // Fallback to download
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `${activeProject?.name || "report"}.png`; a.click();
                URL.revokeObjectURL(url);
                flash("download");
              }
            }
          }, "image/png");
        } else {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `${activeProject?.name || "report"}.png`; a.click();
              URL.revokeObjectURL(url);
              flash("download");
            }
          }, "image/png");
        }
        setLoading(null);
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgText)));
    } catch {
      setLoading(null);
    }
  };

  const shareBtn = "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--fg-secondary)] transition-all hover:bg-[var(--warm-glow)] hover:text-[var(--fg)] disabled:opacity-40";

  return (
    <nav className="flex flex-col gap-1 overflow-x-auto bg-[var(--bg-elevated)] px-3 py-2 md:border-e md:border-[var(--border-subtle)] md:px-3 md:py-4 md:h-[calc(100vh-64px)] md:sticky md:top-16 md:overflow-y-auto">
      {/* Nav links */}
      <div className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5 md:flex-1">
        <div className="hidden px-3 pb-3 md:block">
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
              className={`lift group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition-all duration-150 ${
                active
                  ? "bg-[var(--fg)] font-medium text-[var(--bg-elevated)] shadow-md"
                  : "text-[var(--fg-secondary)] hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              <span className="whitespace-nowrap">{t(label)}</span>
            </Link>
          );
        })}
      </div>

      {/* Share/Export — sticky bottom on desktop, horizontal row on mobile */}
      {projectId && (
        <>
          {/* Mobile: horizontal scrollable row below nav */}
          <div className="flex md:hidden items-center gap-1.5 border-t border-[var(--border-subtle)] px-2 py-1.5 overflow-x-auto shrink-0">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] whitespace-nowrap">{t("export.title")}</span>
            <button onClick={exportToSheets} disabled={!!loading} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium text-[var(--fg-secondary)] whitespace-nowrap hover:bg-[var(--warm-glow)]">
              <FileSpreadsheet size={13} className="text-[#0F9D58]" />
              {done === "sheets" ? <Check size={11} className="text-[var(--success)]" /> : loading === "sheets" ? "..." : t("export.sheets")}
            </button>
            <button onClick={exportToDocs} disabled={!!loading} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium text-[var(--fg-secondary)] whitespace-nowrap hover:bg-[var(--warm-glow)]">
              <FileText size={13} className="text-[#4285F4]" />
              {done === "docs" ? <Check size={11} className="text-[var(--success)]" /> : loading === "docs" ? "..." : t("export.docs")}
            </button>
            <button onClick={shareWhatsApp} disabled={!!loading} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium text-[var(--fg-secondary)] whitespace-nowrap hover:bg-[var(--warm-glow)]">
              <MessageCircle size={13} className="text-[#25D366]" />
              {done === "whatsapp" ? <Check size={11} className="text-[var(--success)]" /> : loading === "whatsapp" ? "..." : t("export.whatsapp")}
            </button>
            <button onClick={() => generateInfographic("copy")} disabled={!!loading} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium text-[var(--fg-secondary)] whitespace-nowrap hover:bg-[var(--warm-glow)]">
              <Copy size={13} className="text-[var(--accent)]" />
              {done === "copy" ? <Check size={11} className="text-[var(--success)]" /> : loading === "image" ? "..." : t("export.png")}
            </button>
            <button onClick={() => generateInfographic("download")} disabled={!!loading} className="rounded-lg p-2 text-[var(--fg-muted)]/30 hover:bg-[var(--warm-glow)] hover:text-[var(--fg)] disabled:opacity-40">
              {done === "download" ? <Check size={13} className="text-[var(--success)]" /> : <Download size={13} />}
            </button>
          </div>

          {/* Desktop: vertical list at bottom of sidebar */}
          <div className="hidden md:block border-t border-[var(--border-subtle)] pt-2 mt-auto shrink-0">
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
              {t("export.title")}
            </p>
            <button onClick={exportToSheets} disabled={!!loading} className={shareBtn}>
              <FileSpreadsheet size={13} className="text-[#0F9D58]" />
              {done === "sheets" ? <><Check size={11} className="text-[var(--success)]" /></> : loading === "sheets" ? "..." : t("export.sheets")}
            </button>
            <button onClick={exportToDocs} disabled={!!loading} className={shareBtn}>
              <FileText size={13} className="text-[#4285F4]" />
              {done === "docs" ? <><Check size={11} className="text-[var(--success)]" /></> : loading === "docs" ? "..." : t("export.docs")}
            </button>
            <button onClick={shareWhatsApp} disabled={!!loading} className={shareBtn}>
              <MessageCircle size={13} className="text-[#25D366]" />
              {done === "whatsapp" ? <><Check size={11} className="text-[var(--success)]" /></> : loading === "whatsapp" ? "..." : t("export.whatsapp")}
            </button>
            <div className="flex gap-0.5">
              <button onClick={() => generateInfographic("copy")} disabled={!!loading} className={`${shareBtn} flex-1`}>
                <Copy size={13} className="text-[var(--accent)]" />
                {done === "copy" ? <><Check size={11} className="text-[var(--success)]" /></> : loading === "image" ? "..." : t("export.png")}
              </button>
              <button onClick={() => generateInfographic("download")} disabled={!!loading} className="rounded-lg p-1.5 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--warm-glow)] hover:text-[var(--fg)] disabled:opacity-40">
                {done === "download" ? <Check size={13} className="text-[var(--success)]" /> : <Download size={13} />}
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
