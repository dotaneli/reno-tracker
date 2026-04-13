"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { FileText, Download, X } from "lucide-react";

interface Props {
  url: string;
  name?: string | null;
  className?: string;
}

/** Detect image vs pdf from the stored filename OR the URL's pathname. Falls back to pdf. */
function detectKind(url: string, name?: string | null): "image" | "pdf" {
  // Prefer the stored name — it's explicit. Fall back to URL pathname (strip querystring).
  const target = (name || url.split("?")[0]).toLowerCase();
  if (/\.pdf$/.test(target)) return "pdf";
  if (/\.(jpe?g|png|gif|webp|avif)$/.test(target)) return "image";
  return "pdf";
}

/**
 * Cross-origin-safe download: fetch the blob then trigger a download with
 * the intended filename. The HTML `download` attribute is ignored by browsers
 * when the href is on a different origin (which Vercel Blob always is), so
 * a plain <a download="..."> just opens the file in a new tab instead of
 * saving it — that's why PDF receipts were opening inline as a preview.
 */
async function downloadBlob(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function ReceiptViewer({ url, name, className }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const kind = detectKind(url, name);
  const image = kind === "image";
  const displayName = name || (image ? "receipt.jpg" : "receipt.pdf");

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
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try { await downloadBlob(url, displayName); }
                    catch { window.open(url, "_blank", "noopener,noreferrer"); }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Download size={12} />
                  {t("receipt.download")}
                </button>
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
