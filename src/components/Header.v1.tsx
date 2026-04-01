"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import { LangToggle } from "./LangToggle";
import { LogOut, Undo2, Redo2 } from "lucide-react";
import { mutate } from "swr";

interface HeaderProps {
  user?: { name?: string | null; image?: string | null } | null;
}

export function Header({ user }: HeaderProps) {
  const { t } = useI18n();
  const { activeProject } = useProject();
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);
  const [redoLoading, setRedoLoading] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

  const showToast = useCallback((text: string, type: "success" | "error") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const handleUndo = useCallback(async () => {
    if (!activeProject || undoLoading) return;
    setUndoLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/undo`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.description || t("general.undo"), "success");
        mutate(() => true, undefined, { revalidate: true });
      } else {
        showToast(data.description || t("general.nothingToUndo"), "error");
      }
    } catch {
      showToast(t("general.error"), "error");
    } finally {
      setUndoLoading(false);
    }
  }, [activeProject, undoLoading, showToast, t]);

  const handleRedo = useCallback(async () => {
    if (!activeProject || redoLoading) return;
    setRedoLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/redo`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.description || t("general.redo"), "success");
        mutate(() => true, undefined, { revalidate: true });
      } else {
        showToast(data.description || t("general.nothingToRedo"), "error");
      }
    } catch {
      showToast(t("general.error"), "error");
    } finally {
      setRedoLoading(false);
    }
  }, [activeProject, redoLoading, showToast, t]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea, select, or contentEditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      // Undo: Ctrl+Z / Cmd+Z (without Shift)
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Shift+Z
      if (e.key === "y" && !isMac) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === "z" && e.shiftKey && isMac) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, isMac]);

  const undoTitle = isMac ? t("general.undoHintMac") : t("general.undoHint");
  const redoTitle = isMac ? t("general.redoHintMac") : t("general.redoHint");

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--fg)]">
            <div className="h-3 w-3 rounded-[3px] bg-[var(--accent)]" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            {t("login.title")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo — fixed order, always LTR so they don't flip with RTL */}
          {activeProject && (
            <div className="flex items-center gap-1" dir="ltr">
              <button
                onClick={handleUndo}
                disabled={undoLoading}
                className="rounded-lg p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[var(--fg-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--fg)] disabled:hover:bg-transparent disabled:hover:text-[var(--fg-muted)]"
                title={undoTitle}
              >
                <Undo2 size={16} />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoLoading}
                className="rounded-lg p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[var(--fg-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--fg)] disabled:hover:bg-transparent disabled:hover:text-[var(--fg-muted)]"
                title={redoTitle}
              >
                <Redo2 size={16} />
              </button>
            </div>
          )}

          {/* Toast notification */}
          {toast && (
            <span
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium animate-[fadeIn_0.2s] ${
                toast.type === "success"
                  ? "bg-[var(--fg)] text-[var(--bg-elevated)]"
                  : "bg-red-600 text-white"
              }`}
            >
              {toast.text}
            </span>
          )}

          <div className="h-4 w-px bg-[var(--border)] mx-1" />
          <LangToggle />

          {user && (
            <div className="flex items-center gap-3 ms-2">
              {user.image && (
                <img src={user.image} alt="" className="h-8 w-8 rounded-full ring-2 ring-[var(--border-subtle)]" referrerPolicy="no-referrer" />
              )}
              <div className="hidden md:block">
                <p className="text-xs font-medium text-[var(--fg)]">{user.name}</p>
              </div>
              <a href="/api/auth/signout" className="rounded-lg p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--fg-muted)] transition-all hover:bg-[var(--border-subtle)] hover:text-[var(--fg)]" title={t("nav.signOut")}>
                <LogOut size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
      {/* Version toggle */}
      <a href="https://reno-tracker-v2.vercel.app" target="_blank" rel="noopener noreferrer"
        className="absolute end-3 bottom-0 translate-y-full rounded-b-lg bg-[var(--accent)] px-2 py-0.5 text-[9px] font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] z-50">
        Try V2 →
      </a>
    </header>
  );
}
