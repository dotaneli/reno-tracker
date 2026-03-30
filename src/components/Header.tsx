"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import { useApi } from "@/hooks/useApi";
import { LangToggle } from "./LangToggle";
import { ShareSheet } from "./ShareSheet";
import {
  LogOut, Share2, ChevronDown, Settings, Shield,
} from "lucide-react";
import Link from "next/link";
import { mutate } from "swr";

interface HeaderProps {
  user?: { name?: string | null; image?: string | null } | null;
}

export function Header({ user }: HeaderProps) {
  const { t, lang } = useI18n();
  const { activeProject, projects, setActiveProjectId } = useProject();
  const { data: me } = useApi<any>("/api/me");
  const isAdmin = me?.isAdmin === true;

  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);
  const [redoLoading, setRedoLoading] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Dropdown states
  const [projectDropdown, setProjectDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const shareBtnRef = useRef<HTMLButtonElement>(null);

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

  // Global keyboard shortcuts (invisible — no buttons)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
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

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 md:px-5">
        {/* Left: Logo + Project Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
            <div className="h-2.5 w-2.5 rounded-[2px] bg-white" />
          </div>

          <div className="relative" ref={projectDropdownRef}>
            <button
              onClick={() => setProjectDropdown(!projectDropdown)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[14px] font-semibold tracking-tight text-[var(--fg)] transition-all hover:bg-[var(--border-subtle)]"
            >
              {activeProject?.name || t("general.noProject")}
              <ChevronDown size={14} className={`text-[var(--fg-muted)] transition-transform ${projectDropdown ? "rotate-180" : ""}`} />
            </button>

            {projectDropdown && (
              <div className="absolute top-full mt-1 start-0 w-56 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 shadow-xl z-50">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--fg-muted)]">
                  {t("nav.projects")}
                </div>
                {projects.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveProjectId(p.id); setProjectDropdown(false); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-all ${
                      p.id === activeProject?.id
                        ? "bg-[var(--accent)]/10 font-medium text-[var(--accent)]"
                        : "text-[var(--fg-secondary)] hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${p.id === activeProject?.id ? "bg-[var(--accent)]" : "border border-[var(--border)]"}`} />
                    {p.name}
                  </button>
                ))}
                <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                  <Link
                    href="/projects"
                    onClick={() => setProjectDropdown(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-[var(--fg-muted)] hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]"
                  >
                    {t("proj.title")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Share + Avatar menu */}
        <div className="flex items-center gap-1.5">
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

          {/* Share button */}
          {activeProject && (
            <div className="relative">
              <button
                ref={shareBtnRef}
                onClick={() => setShareOpen(!shareOpen)}
                className="rounded-lg p-2 text-[var(--fg-muted)] transition-all hover:bg-[var(--border-subtle)] hover:text-[var(--fg)]"
                title={t("share.title")}
              >
                <Share2 size={16} />
              </button>
              <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} anchorRef={shareBtnRef} />
            </div>
          )}

          {/* User avatar + dropdown */}
          {user && (
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-1 rounded-lg p-1 transition-all hover:bg-[var(--border-subtle)]"
              >
                {user.image ? (
                  <img src={user.image} alt="" className="h-7 w-7 rounded-full ring-2 ring-[var(--border-subtle)]" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--fg)]/10 text-[11px] font-bold text-[var(--fg)]">
                    {(user.name || "?")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[9px] font-bold text-[var(--fg-muted)]">{lang.toUpperCase()}</span>
                <ChevronDown size={12} className={`text-[var(--fg-muted)] transition-transform ${userDropdown ? "rotate-180" : ""}`} />
              </button>

              {userDropdown && (
                <div className="absolute top-full mt-1 end-0 w-52 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 shadow-xl z-50">
                  {/* User name */}
                  <div className="px-3 py-2 border-b border-[var(--border-subtle)] mb-1">
                    <p className="text-[12px] font-medium text-[var(--fg)]">{user.name}</p>
                  </div>

                  {/* Language toggle */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[12px] text-[var(--fg-secondary)]">{t("general.toggleLanguage")}</span>
                    <LangToggle />
                  </div>

                  {/* Settings */}
                  <Link
                    href="/settings"
                    onClick={() => setUserDropdown(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-[var(--fg-secondary)] hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]"
                  >
                    <Settings size={14} />
                    {t("nav.settings")}
                  </Link>

                  {/* Admin */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdown(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-[var(--fg-secondary)] hover:bg-[var(--warm-glow)] hover:text-[var(--fg)]"
                    >
                      <Shield size={14} />
                      {t("nav.admin")}
                    </Link>
                  )}

                  <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                    <a
                      href="/api/auth/signout"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-red-500 hover:bg-red-500/10"
                    >
                      <LogOut size={14} />
                      {t("nav.signOut")}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Version toggle */}
      <a href="https://reno-tracker-rho.vercel.app" target="_blank" rel="noopener noreferrer"
        className="absolute end-3 bottom-0 translate-y-full rounded-b-lg bg-[var(--fg-muted)] px-2 py-0.5 text-[9px] font-bold text-white shadow-sm transition-all hover:bg-[var(--fg)] z-50">
        ← Back to V1
      </a>
    </header>
  );
}
