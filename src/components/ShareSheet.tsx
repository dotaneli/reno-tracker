"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import {
  MessageCircle, FileSpreadsheet, FileText, Image,
  Download, Copy, Check, X, Share,
} from "lucide-react";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

export function ShareSheet({ open, onClose, anchorRef }: ShareSheetProps) {
  const { t, lang } = useI18n();
  const { activeProject } = useProject();
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const projectId = activeProject?.id;

  const flash = (key: string) => {
    setDone(key);
    setTimeout(() => setDone(null), 2000);
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        sheetRef.current &&
        !sheetRef.current.contains(e.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

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

  // ── WhatsApp: direct wa.me link ──
  const shareWhatsApp = async () => {
    if (!projectId) return;
    setLoading("whatsapp");
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=whatsapp`);
      const data = await res.json();
      window.open(`https://wa.me/?text=${encodeURIComponent(data.text)}`, "_blank");
      flash("whatsapp");
    } catch {}
    setLoading(null);
  };

  // ── Infographic: generate and offer download or clipboard ──
  const generateInfographic = useCallback(async (action: "copy" | "download") => {
    if (!projectId) return;
    setLoading("image");
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=infographic`);
      const svgText = await res.text();
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
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${activeProject?.name || "report"}.png`;
                a.click();
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
              a.href = url;
              a.download = `${activeProject?.name || "report"}.png`;
              a.click();
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
  }, [projectId, activeProject?.name]);

  // ── Google Sheets export ──
  const exportToSheets = useCallback(async () => {
    if (!projectId) return;
    setLoading("gsheets");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/export-sheets?lang=${lang}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "google_auth_required") {
          setError(t("export.googleAuthError"));
        } else {
          setError(data.message || "Export failed");
        }
        setLoading(null);
        return;
      }
      window.open(data.url, "_blank");
      flash("gsheets");
    } catch {
      setError("Export failed");
    }
    setLoading(null);
  }, [projectId, lang, t]);

  // ── Google Docs export ──
  const exportToDocs = useCallback(async () => {
    if (!projectId) return;
    setLoading("gdocs");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/export-docs?lang=${lang}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "google_auth_required") {
          setError(t("export.googleAuthError"));
        } else {
          setError(data.message || "Export failed");
        }
        setLoading(null);
        return;
      }
      window.open(data.url, "_blank");
      flash("gdocs");
    } catch {
      setError("Export failed");
    }
    setLoading(null);
  }, [projectId, lang, t]);

  // ── Native share (mobile) ──
  const nativeShare = useCallback(async () => {
    if (!projectId) return;
    setLoading("native");
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=whatsapp`);
      const data = await res.json();
      await navigator.share({ text: data.text });
      flash("native");
    } catch {}
    setLoading(null);
  }, [projectId]);

  if (!open || !projectId) return null;

  const btnClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[var(--fg-secondary)] transition-all hover:bg-[var(--warm-glow)] hover:text-[var(--fg)] disabled:opacity-40";

  const items = (
    <>
      <button onClick={shareWhatsApp} disabled={!!loading} className={btnClass}>
        <MessageCircle size={16} className="text-[#25D366]" />
        <span className="flex-1 text-start">{t("export.whatsapp")}</span>
        {done === "whatsapp" && <Check size={14} className="text-[var(--success)]" />}
        {loading === "whatsapp" && <span className="text-[10px]">...</span>}
      </button>
      <button onClick={exportToSheets} disabled={!!loading} className={btnClass}>
        <FileSpreadsheet size={16} className="text-[#0F9D58]" />
        <span className="flex-1 text-start">{t("export.sheets")}</span>
        {done === "gsheets" && <Check size={14} className="text-[var(--success)]" />}
        {loading === "gsheets" && <span className="text-[10px]">...</span>}
      </button>
      <button onClick={exportToDocs} disabled={!!loading} className={btnClass}>
        <FileText size={16} className="text-[#4285F4]" />
        <span className="flex-1 text-start">{t("export.docs")}</span>
        {done === "gdocs" && <Check size={14} className="text-[var(--success)]" />}
        {loading === "gdocs" && <span className="text-[10px]">...</span>}
      </button>
      <button onClick={() => downloadFile("csv", "csv")} disabled={!!loading} className={btnClass}>
        <Download size={16} className="text-[var(--fg-muted)]" />
        <span className="flex-1 text-start">{t("export.csv")}</span>
        {done === "csv" && <Check size={14} className="text-[var(--success)]" />}
        {loading === "csv" && <span className="text-[10px]">...</span>}
      </button>
      <button onClick={() => downloadFile("html", "html")} disabled={!!loading} className={btnClass}>
        <FileText size={16} className="text-[var(--fg-muted)]" />
        <span className="flex-1 text-start">{t("export.html")}</span>
        {done === "html" && <Check size={14} className="text-[var(--success)]" />}
        {loading === "html" && <span className="text-[10px]">...</span>}
      </button>
      <div className="flex gap-1">
        <button onClick={() => generateInfographic("copy")} disabled={!!loading} className={`${btnClass} flex-1`}>
          <Copy size={16} className="text-[var(--accent)]" />
          <span className="flex-1 text-start">{t("share.screenshot")}</span>
          {done === "copy" && <Check size={14} className="text-[var(--success)]" />}
          {loading === "image" && <span className="text-[10px]">...</span>}
        </button>
        <button
          onClick={() => generateInfographic("download")}
          disabled={!!loading}
          className="rounded-xl p-2.5 text-[var(--fg-muted)] transition-all hover:bg-[var(--warm-glow)] hover:text-[var(--fg)] disabled:opacity-40"
        >
          {done === "download" ? <Check size={14} className="text-[var(--success)]" /> : <Download size={14} />}
        </button>
      </div>
      {error && (
        <div className="px-3 py-2 text-[12px] text-[var(--error)] bg-[var(--error-bg,rgba(196,97,74,0.08))] rounded-lg mt-1">
          {error}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: dropdown */}
      <div
        ref={sheetRef}
        className="hidden md:block absolute top-full mt-2 end-0 w-64 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 shadow-xl z-50"
      >
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
          {t("export.title")}
        </div>
        {items}
      </div>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div
          ref={sheetRef}
          className="absolute bottom-0 inset-x-0 rounded-t-2xl bg-[var(--bg-elevated)] p-4 pb-20 animate-[slideUp_0.2s_ease-out]"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[var(--fg)]">{t("export.title")}</span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]">
              <X size={16} />
            </button>
          </div>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button onClick={nativeShare} disabled={!!loading} className={btnClass}>
              <Share size={16} className="text-[var(--accent)]" />
              <span className="flex-1 text-start">{t("share.native")}</span>
              {done === "native" && <Check size={14} className="text-[var(--success)]" />}
              {loading === "native" && <span className="text-[10px]">...</span>}
            </button>
          )}
          {items}
        </div>
      </div>
    </>
  );
}
