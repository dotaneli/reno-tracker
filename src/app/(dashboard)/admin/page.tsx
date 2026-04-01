"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useApi } from "@/hooks/useApi";
import { Card, StatCard } from "@/components/Card";
import { Expandable } from "@/components/Expandable";
import { Shield, Users, FolderKanban, Layers, Crown, Pencil, Eye, ScrollText, RefreshCw, AlertTriangle, AlertCircle, Info } from "lucide-react";

const roleIcons: Record<string, any> = { OWNER: Crown, ADMIN: Shield, EDITOR: Pencil, VIEWER: Eye };

interface AdminData {
  stats: { totalUsers: number; totalProjects: number; totalNodes: number };
  users: { id: string; name: string | null; email: string; image: string | null; createdAt: string; projectCount: number }[];
  projects: {
    id: string; name: string; budget: string; createdAt: string; memberCount: number; nodeCount: number;
    members: { role: string; userId: string; name: string | null; email: string; image: string | null }[];
  }[];
}

const levelIcon: Record<string, any> = { error: AlertTriangle, warn: AlertCircle, info: Info };
const levelColor: Record<string, string> = { error: "text-[var(--alert)]", warn: "text-[var(--accent)]", info: "text-[var(--fg-muted)]" };

export default function AdminPage() {
  const { t } = useI18n();
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logKey, setLogKey] = useState(0);
  const { data: me } = useApi<any>("/api/me");
  // Fetch admin data — the API itself enforces the email check server-side
  const { data, error, isLoading } = useApi<AdminData>(me ? "/api/admin" : null);
  const logUrl = me ? `/api/logs?limit=200${logFilter !== "all" ? `&level=${logFilter}` : ""}&_k=${logKey}` : null;
  const { data: logs } = useApi<any[]>(logUrl);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <Shield size={48} className="mx-auto mb-4 text-[var(--fg-muted)]" />
        <p className="text-lg font-semibold text-[var(--fg)]">403</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      </div>
    );
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString();
  const fmtBudget = (v: string) => Number(v).toLocaleString();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[var(--accent-soft)] p-2.5">
          <Shield size={20} className="text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("nav.admin")}</h1>
          <p className="text-xs text-[var(--fg-muted)]">{t("admin.systemOverview")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t("admin.totalUsers")} value={data.stats.totalUsers} icon={<Users size={18} />} />
        <StatCard label={t("admin.totalProjects")} value={data.stats.totalProjects} icon={<FolderKanban size={18} />} />
        <StatCard label={t("admin.totalNodes")} value={data.stats.totalNodes} icon={<Layers size={18} />} />
      </div>

      {/* Users */}
      <Card>
        <Expandable
          defaultOpen
          trigger={
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-[var(--accent-soft)] p-2">
                <Users size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--fg)]">{t("admin.allUsers")}</p>
              <span className="rounded-full bg-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--fg-muted)]">
                {data.users.length}
              </span>
            </div>
          }
        >
          <div className="space-y-2 mt-1">
            {data.users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)] p-3">
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <img src={user.image} alt="" className="h-9 w-9 rounded-full ring-2 ring-[var(--border-subtle)]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                      {(user.name || user.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">{user.name || user.email}</p>
                    <p className="text-xs text-[var(--fg-muted)]">{user.email}</p>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-medium text-[var(--fg-secondary)]">
                    {user.projectCount} {t("admin.projects")}
                  </p>
                  <p className="text-[10px] text-[var(--fg-muted)]">{fmt(user.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      </Card>

      {/* Projects */}
      <Card>
        <Expandable
          defaultOpen
          trigger={
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-[var(--accent-soft)] p-2">
                <FolderKanban size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--fg)]">{t("admin.allProjects")}</p>
              <span className="rounded-full bg-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--fg-muted)]">
                {data.projects.length}
              </span>
            </div>
          }
        >
          <div className="space-y-2 mt-1">
            {data.projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">{project.name}</p>
                    <p className="text-xs text-[var(--fg-muted)]">
                      {t("proj.budget")}: {fmtBudget(project.budget)} &middot; {project.memberCount} {t("admin.members")} &middot; {project.nodeCount} {t("admin.nodes")}
                    </p>
                  </div>
                  <p className="text-[10px] text-[var(--fg-muted)] shrink-0">{fmt(project.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      </Card>

      {/* Teams */}
      <Card>
        <Expandable
          defaultOpen
          trigger={
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-[var(--accent-soft)] p-2">
                <Shield size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--fg)]">{t("admin.allTeams")}</p>
            </div>
          }
        >
          <div className="space-y-3 mt-1">
            {data.projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)] p-3">
                <p className="text-sm font-semibold text-[var(--fg)] mb-2">{project.name}</p>
                <div className="space-y-1.5">
                  {project.members.map((member) => {
                    const RoleIcon = roleIcons[member.role] || Eye;
                    return (
                      <div key={member.userId} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {member.image ? (
                            <img src={member.image} alt="" className="h-7 w-7 rounded-full ring-1 ring-[var(--border-subtle)]" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
                              {(member.name || member.email)?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-[var(--fg)]">{member.name || member.email}</p>
                            <p className="text-[10px] text-[var(--fg-muted)]">{member.email}</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 rounded-lg bg-[var(--border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--fg-secondary)]">
                          <RoleIcon size={10} />
                          {member.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      </Card>

      {/* System Logs */}
      <Card>
        <Expandable
          defaultOpen
          trigger={
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-[var(--accent-soft)] p-2">
                <ScrollText size={16} className="text-[var(--accent)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--fg)]">{t("admin.logs")}</p>
              {logs && <span className="rounded-full bg-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--fg-muted)]">{logs.length}</span>}
            </div>
          }
        >
          <div className="mt-2 space-y-2">
            {/* Filters + refresh */}
            <div className="flex items-center gap-2 flex-wrap">
              {["all", "error", "warn", "info"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors ${logFilter === lvl ? "bg-[var(--accent)] text-white" : "bg-[var(--border-subtle)] text-[var(--fg-muted)] hover:bg-[var(--border)]"}`}
                >
                  {lvl === "all" ? t("admin.logsAll") : lvl.toUpperCase()}
                </button>
              ))}
              <button onClick={() => setLogKey((k) => k + 1)} className="ms-auto rounded-lg bg-[var(--border-subtle)] p-1.5 text-[var(--fg-muted)] hover:bg-[var(--border)]">
                <RefreshCw size={12} />
              </button>
            </div>

            {/* Log entries */}
            <div className="max-h-96 overflow-y-auto space-y-1">
              {!logs || logs.length === 0 ? (
                <p className="py-4 text-center text-xs text-[var(--fg-muted)]">{t("admin.logsEmpty")}</p>
              ) : (
                logs.map((entry: any, i: number) => {
                  const LevelIcon = levelIcon[entry.level] || Info;
                  const color = levelColor[entry.level] || "";
                  return (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] p-2.5">
                      <LevelIcon size={14} className={`shrink-0 mt-0.5 ${color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--fg-secondary)]">{entry.event}</span>
                          <span className="text-[10px] text-[var(--fg-muted)]">{new Date(entry.ts).toLocaleString()}</span>
                        </div>
                        {entry.message && <p className="mt-0.5 text-xs text-[var(--fg)]">{entry.message}</p>}
                        {entry.error && <p className="mt-0.5 text-xs text-[var(--alert)]">{entry.error}</p>}
                        {entry.userId && <p className="text-[10px] text-[var(--fg-muted)]">user: {entry.userId}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Expandable>
      </Card>
    </div>
  );
}
