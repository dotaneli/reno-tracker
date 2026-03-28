"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { FileSpreadsheet, FileText, MessageCircle, Share2, Check } from "lucide-react";

export function ExportButtons({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const downloadExport = async (format: string, ext: string) => {
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
    setLoading("whatsapp");
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=whatsapp`);
      const data = await res.json();
      // Try native share first (mobile), fallback to wa.me link
      if (navigator.share) {
        await navigator.share({ text: data.text });
      } else {
        window.open(data.shareUrl, "_blank");
      }
    } catch {}
    setLoading(null);
  };

  const copyReport = async () => {
    setLoading("copy");
    try {
      const res = await fetch(`/api/projects/${projectId}/export?format=whatsapp`);
      const data = await res.json();
      await navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
    setLoading(null);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => downloadExport("csv", "csv")}
        disabled={loading === "csv"}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold text-[var(--fg)] shadow-sm transition-all hover:border-[var(--accent)]/30 hover:shadow-md disabled:opacity-50"
      >
        <FileSpreadsheet size={15} className="text-[#0F9D58]" />
        {loading === "csv" ? "..." : t("export.sheets")}
      </button>

      <button
        onClick={() => downloadExport("html", "html")}
        disabled={loading === "html"}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold text-[var(--fg)] shadow-sm transition-all hover:border-[var(--accent)]/30 hover:shadow-md disabled:opacity-50"
      >
        <FileText size={15} className="text-[#4285F4]" />
        {loading === "html" ? "..." : t("export.docs")}
      </button>

      <button
        onClick={shareWhatsApp}
        disabled={loading === "whatsapp"}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold text-[var(--fg)] shadow-sm transition-all hover:border-[#25D366]/30 hover:shadow-md disabled:opacity-50"
      >
        <MessageCircle size={15} className="text-[#25D366]" />
        {loading === "whatsapp" ? "..." : t("export.whatsapp")}
      </button>

      <button
        onClick={copyReport}
        disabled={loading === "copy"}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold text-[var(--fg)] shadow-sm transition-all hover:border-[var(--accent)]/30 hover:shadow-md disabled:opacity-50"
      >
        {copied ? <Check size={15} className="text-[var(--success)]" /> : <Share2 size={15} className="text-[var(--fg-muted)]" />}
        {copied ? t("export.copied") : loading === "copy" ? "..." : "Copy"}
      </button>
    </div>
  );
}
