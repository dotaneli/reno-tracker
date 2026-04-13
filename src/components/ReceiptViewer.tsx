"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { FileText, Download, X } from "lucide-react";

interface Props {
  url: string;
  name?: string | null;
  className?: string;
}

function isImage(url: string, name?: string | null): boolean {
  const target = (name || url).toLowerCase().split("?")[0];
  return /\.(jpe?g|png|gif|webp|avif)$/.test(target);
}

export function ReceiptViewer({ url, name, className }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const image = isImage(url, name);
  const displayName = name || (image ? "image" : "receipt.pdf");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={t("receipt.view")}
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg)] transition-all hover:border-[var(--accent)] ${className || ""}`}
      >
        {image ? (
          <img src={url} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <FileText size={16} className="text-[var(--accent)]" />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[var(--bg-elevated)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <span className="truncate text-sm font-semibold text-[var(--fg)]">{displayName}</span>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  download={displayName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Download size={12} />
                  {t("receipt.download")}
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--border-subtle)]"
                  aria-label={t("receipt.close")}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-[var(--bg)]">
              {image ? (
                <img src={url} alt={displayName} className="mx-auto max-h-[80vh] object-contain" />
              ) : (
                <iframe src={url} title={displayName} className="h-[80vh] w-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
