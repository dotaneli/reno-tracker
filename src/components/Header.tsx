"use client";

import { useState } from "react";
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
  const [undoMsg, setUndoMsg] = useState("");

  const handleUndo = async () => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/undo`, { method: "POST" });
    const data = await res.json();
    setUndoMsg(data.description || "");
    setTimeout(() => setUndoMsg(""), 2000);
    // Refresh all data
    mutate(() => true, undefined, { revalidate: true });
  };

  const handleRedo = async () => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/redo`, { method: "POST" });
    const data = await res.json();
    setUndoMsg(data.description || "");
    setTimeout(() => setUndoMsg(""), 2000);
    mutate(() => true, undefined, { revalidate: true });
  };

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
          {/* Undo / Redo */}
          {activeProject && (
            <div className="flex items-center gap-1">
              <button onClick={handleUndo} className="rounded-lg p-2 text-[var(--fg-muted)] transition-all hover:bg-[var(--border-subtle)] hover:text-[var(--fg)]" title={t("general.undo")}>
                <Undo2 size={16} />
              </button>
              <button onClick={handleRedo} className="rounded-lg p-2 text-[var(--fg-muted)] transition-all hover:bg-[var(--border-subtle)] hover:text-[var(--fg)]" title={t("general.redo")}>
                <Redo2 size={16} />
              </button>
            </div>
          )}

          {/* Undo/Redo feedback toast */}
          {undoMsg && (
            <span className="rounded-lg bg-[var(--fg)] px-3 py-1.5 text-[11px] font-medium text-[var(--bg-elevated)] animate-[fadeIn_0.2s]">
              {undoMsg}
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
              <a href="/api/auth/signout" className="rounded-lg p-2 text-[var(--fg-muted)] transition-all hover:bg-[var(--border-subtle)] hover:text-[var(--fg)]" title={t("nav.signOut")}>
                <LogOut size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
