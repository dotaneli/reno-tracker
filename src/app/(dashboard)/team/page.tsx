"use client";

import { useState } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n } from "@/lib/i18n";
import { useApi, apiPost, apiDelete } from "@/hooks/useApi";
import { Card } from "@/components/Card";
import { UserPlus, Trash2, Crown, Shield, Pencil, Eye, Clock, Copy, Check, Users } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";

const roleIcons: Record<string, any> = { OWNER: Crown, ADMIN: Shield, EDITOR: Pencil, VIEWER: Eye };
const roleKeys: Record<string, any> = { OWNER: "team.owner", ADMIN: "team.admin", EDITOR: "team.editor", VIEWER: "team.viewer" };

export default function TeamPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const { activeProject: project } = useProject();
  const { data: me } = useApi<any>("/api/me");
  const { data: teamData } = useApi<{ members: any[]; pendingInvites: any[] }>(
    project ? `/api/projects/${project.id}/members` : null
  );

  const members = teamData?.members || [];
  const pendingInvites = teamData?.pendingInvites || [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    try {
      await apiPost(`/api/projects/${project.id}/members`, { email, role });
      setSuccess(t("team.invited").replace("{email}", email));
      setEmail(""); mutate(`/api/projects/${project.id}/members`);
    } catch (err: any) { setError(err.message); }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(t("team.removeConfirm").replace("{name}", name))) return;
    try {
      await apiDelete(`/api/projects/${project.id}/members`, { userId });
      mutate(`/api/projects/${project.id}/members`);
    } catch (err: any) { setError(err.message); }
  };

  const copyLink = (inviteEmail: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/login`);
    setCopied(inviteEmail); setTimeout(() => setCopied(null), 2000);
  };

  const isOwner = members.some((m: any) => m.userId === me?.id && m.role === "OWNER");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("team.title")}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--fg-muted)]">
            <Users size={14} />
            {members.length + pendingInvites.length}
          </p>
        </div>
      </div>

      {/* Invite */}
      {isOwner && (
        <Card glow>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="rounded-lg bg-[var(--accent-soft)] p-2">
              <UserPlus size={16} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--fg)]">{t("team.invite")}</p>
              <p className="text-[11px] text-[var(--fg-muted)]">{t("team.inviteHint")}</p>
            </div>
          </div>
          <form onSubmit={handleInvite} className="space-y-3">
            <input type="email" placeholder={t("team.email")} value={email} onChange={(e) => setEmail(e.target.value)} required className={input} />
            <div className="flex gap-3">
              <select value={role} onChange={(e) => setRole(e.target.value as string)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]">
                <option value="ADMIN">{t("team.admin")}</option>
                <option value="EDITOR">{t("team.editor")}</option>
                <option value="VIEWER">{t("team.viewer")}</option>
              </select>
              <button type="submit" className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg">
                {t("team.send")}
              </button>
            </div>
            {error && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            {success && <p className="text-xs font-medium text-[var(--success)]">{success}</p>}
          </form>
        </Card>
      )}

      {/* Members */}
      <div className="space-y-2">
        {members.map((member: any) => {
          const RoleIcon = roleIcons[member.role as keyof typeof roleIcons];
          const isMe = member.userId === me?.id;
          return (
            <Card key={member.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  {member.user.image ? (
                    <img src={member.user.image} alt="" className="h-10 w-10 rounded-full ring-2 ring-[var(--border-subtle)]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                      {(member.user.name || member.user.email)?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[var(--fg)]">
                      {member.user.name || member.user.email}
                      {isMe && <span className="ms-1.5 text-[11px] font-normal text-[var(--fg-muted)]">({t("team.you")})</span>}
                    </p>
                    <p className="text-xs text-[var(--fg-muted)]">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1.5 rounded-lg bg-[var(--border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--fg-secondary)]">
                    <RoleIcon size={12} />
                    {t(roleKeys[member.role as keyof typeof roleKeys])}
                  </span>
                  {isOwner && !isMe && member.role !== "OWNER" && (
                    <button onClick={() => handleRemove(member.userId, member.user.name)}
                      className="rounded-lg p-2 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--alert-soft)] hover:text-[var(--alert)]" title={t("team.remove")}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {/* Pending */}
        {pendingInvites.map((invite: any) => (
          <Card key={invite.id} className="border-dashed border-[var(--accent)]/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                  <Clock size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--fg-secondary)]">{invite.email}</p>
                  <p className="text-[11px] font-medium text-amber-600">{t("team.pendingSignup")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-[var(--border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--fg-secondary)]">
                  {t(roleKeys[invite.role as keyof typeof roleKeys])}
                </span>
                <button onClick={() => copyLink(invite.email)}
                  className="rounded-lg p-2 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--border-subtle)] hover:text-[var(--fg)]" title={t("team.copyLink")}>
                  {copied === invite.email ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
