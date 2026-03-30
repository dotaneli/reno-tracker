"use client";

import { useState, useMemo } from "react";
import { useProject } from "@/hooks/useProject";
import { useI18n } from "@/lib/i18n";
import { useApi, apiPost, apiPatch, apiDelete } from "@/hooks/useApi";
import { useTranslate } from "@/hooks/useTranslate";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, X, ChevronDown, CheckCircle2, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { mutate } from "swr";

const input = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10";
const sel = "w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 pe-9 text-sm text-[var(--fg)] outline-none transition-all focus:border-[var(--accent)]";

export default function IssuesPage() {
  const { t } = useI18n();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { activeProject: project } = useProject();
  const { data: issues } = useApi<any[]>(project ? `/api/issues?projectId=${project.id}` : null);
  const { data: allNodes } = useApi<any[]>(project ? `/api/nodes?projectId=${project.id}` : null);

  const allTexts = useMemo(() => [
    ...(issues?.map((i: any) => i.title) || []),
    ...(issues?.map((i: any) => i.description).filter(Boolean) || []),
    ...(allNodes?.map((sp: any) => sp.name) || []),
  ], [issues, allNodes]);
  const tr = useTranslate(allTexts);

  const sorted = useMemo(() => {
    if (!issues) return [];
    const order = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2 };
    return [...issues].sort((a, b) => (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3));
  }, [issues]);

  const openCount = sorted.filter((i) => i.status !== "RESOLVED").length;

  const [addForm, setAddForm] = useState({ title: "", nodeId: "", description: "" });
  const [editForm, setEditForm] = useState({ title: "", nodeId: "", description: "", status: "OPEN" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiPost("/api/issues", { title: addForm.title, nodeId: addForm.nodeId, description: addForm.description || undefined });
      setAddForm({ title: "", nodeId: "", description: "" }); setShowAdd(false); mutate("/api/issues");
    } catch (err: any) { setError(err.message); }
  };

  const startEdit = (issue: any) => {
    setEditForm({ title: issue.title, nodeId: issue.nodeId, description: issue.description || "", status: issue.status });
    setEditId(issue.id); setShowAdd(false); setError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiPatch(`/api/issues/${editId}`, { title: editForm.title, nodeId: editForm.nodeId, description: editForm.description || undefined, status: editForm.status });
      setEditId(null); mutate("/api/issues");
    } catch (err: any) { setError(err.message); }
  };

  const handleResolve = async (id: string) => {
    await apiPatch(`/api/issues/${id}`, { status: "RESOLVED" }); mutate("/api/issues");
  };

  const handleDelete = async (issue: any) => {
    if (!confirm(t("crud.deleteConfirm").replace("{name}", issue.title))) return;
    await apiDelete(`/api/issues/${issue.id}`); mutate("/api/issues");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{t("issues.title")}</h1>
          {openCount > 0 && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--alert)]">
              <AlertCircle size={14} />{openCount} {t("issues.open").toLowerCase()}
            </p>
          )}
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${showAdd ? "bg-[var(--border-subtle)] text-[var(--fg-secondary)]" : "bg-[var(--fg)] text-[var(--bg-elevated)] shadow-lg shadow-[var(--fg)]/10"}`}>
          {showAdd ? <X size={16} /> : <Plus size={16} />}
          {showAdd ? t("task.cancel") : t("issues.addIssue")}
        </button>
      </div>

      {/* Add new — stays at top */}
      {showAdd && (
        <Card glow>
          <form onSubmit={handleAdd} className="space-y-3">
            <input type="text" placeholder={t("issues.issueTitle")} value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} required className={input} autoFocus />
            <div className="relative">
              <select value={addForm.nodeId} onChange={(e) => setAddForm({ ...addForm, nodeId: e.target.value })} required className={sel}>
                <option value="">{t("task.selectTask")}</option>
                {allNodes?.map((sp: any) => <option key={sp.id} value={sp.id}>{tr(sp.name)}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            </div>
            <textarea placeholder={t("issues.description")} value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} rows={3} className={`${input} resize-none`} />
            {error && !editId && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/20">{t("task.save")}</button>
          </form>
        </Card>
      )}

      {!issues ? (
        <p className="py-16 text-center text-sm text-[var(--fg-muted)]">{t("general.loading")}</p>
      ) : sorted.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="rounded-full bg-[var(--success-soft)] p-3"><CheckCircle2 size={24} className="text-[var(--success)]" /></div>
            <p className="font-medium text-[var(--success)]">{t("dash.noIssues")}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((issue: any) => {
            const isResolved = issue.status === "RESOLVED";
            return (
              <Card key={issue.id} className={isResolved && editId !== issue.id ? "opacity-60" : ""}>
                {editId === issue.id ? (
                  /* ── Inline edit ── */
                  <form onSubmit={handleEdit} className="space-y-3">
                    <button type="button" onClick={() => setEditId(null)} className="flex w-full items-center justify-between rounded-lg px-1 py-1 -mx-1 transition-colors hover:bg-[var(--border-subtle)]">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-[var(--accent)]" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">{t("crud.edit")}</p>
                      </div>
                      <X size={14} className="text-[var(--fg-muted)]" />
                    </button>
                    <input type="text" placeholder={t("issues.issueTitle")} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required className={input} autoFocus />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <select value={editForm.nodeId} onChange={(e) => setEditForm({ ...editForm, nodeId: e.target.value })} required className={sel}>
                          <option value="">{t("task.selectTask")}</option>
                          {allNodes?.map((sp: any) => <option key={sp.id} value={sp.id}>{tr(sp.name)}</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                      </div>
                      <div className="relative">
                        <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className={sel}>
                          <option value="OPEN">{t("issues.open")}</option>
                          <option value="IN_PROGRESS">{t("issues.inProgress")}</option>
                          <option value="RESOLVED">{t("issues.resolved")}</option>
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                      </div>
                    </div>
                    <textarea placeholder={t("issues.description")} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className={`${input} resize-none`} />
                    {error && editId === issue.id && <p className="text-xs font-medium text-[var(--alert)]">{error}</p>}
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white">{t("task.save")}</button>
                      <button type="button" onClick={() => setEditId(null)} className="rounded-xl bg-[var(--border-subtle)] px-5 py-2.5 text-sm text-[var(--fg-secondary)]">{t("task.cancel")}</button>
                    </div>
                  </form>
                ) : (
                  /* ── Normal display ── */
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${isResolved ? "text-[var(--fg-muted)] line-through" : "text-[var(--fg)]"}`}>{tr(issue.title)}</p>
                      {issue.description && <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">{tr(issue.description)}</p>}
                      <p className="mt-1.5 text-[11px] text-[var(--fg-muted)]/60">{issue.node?.name ? tr(issue.node.name) : ""}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <StatusBadge status={issue.status} />
                      {!isResolved && (
                        <button onClick={() => handleResolve(issue.id)} className="rounded-lg p-2 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--success-soft)] hover:text-[var(--success)]" title={t("issues.resolved")}>
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button onClick={() => editId === issue.id ? setEditId(null) : startEdit(issue)} className={`rounded-lg p-2 transition-all ${editId === issue.id ? "bg-[var(--accent)] text-white hover:bg-[var(--alert)]" : "text-[var(--fg-muted)]/30 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"}`} title={editId === issue.id ? t("task.cancel") : t("crud.edit")}>
                        {editId === issue.id ? <X size={14} /> : <Pencil size={14} />}
                      </button>
                      <button onClick={() => handleDelete(issue)} className="rounded-lg p-2 text-[var(--fg-muted)]/30 transition-all hover:bg-[var(--alert-soft)] hover:text-[var(--alert)]" title={t("crud.delete")}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
