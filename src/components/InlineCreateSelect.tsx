"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ChevronDown, Plus, Check, X } from "lucide-react";

const sel = "w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pe-16 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]";
const inp = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder-[var(--fg-muted)]/60 outline-none focus:border-[var(--accent)]";

interface InlineCreateSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  onCreateLabel: string;
  onCreate: (name: string) => Promise<string>; // returns new id
  tr?: (text: string) => string;
  className?: string;
}

export function InlineCreateSelect({
  value, onChange, options, placeholder, onCreateLabel, onCreate, tr, className = "",
}: InlineCreateSelectProps) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const newId = await onCreate(newName.trim());
      onChange(newId);
      setNewName("");
      setCreating(false);
    } catch {}
    setSaving(false);
  };

  if (creating) {
    return (
      <div className={`flex gap-1 ${className}`}>
        <input
          type="text"
          placeholder={onCreateLabel}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleCreate(); } }}
          autoFocus
          className={inp}
        />
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCreate(); }} disabled={saving}
          className="shrink-0 rounded-lg bg-[var(--accent)] p-2 text-white"><Check size={14} /></button>
        <button type="button" onClick={(e) => { e.preventDefault(); setCreating(false); setNewName(""); }}
          className="shrink-0 rounded-lg bg-[var(--border-subtle)] p-2 text-[var(--fg-secondary)]"><X size={14} /></button>
      </div>
    );
  }

  return (
    <div className={`relative flex gap-1 ${className}`}>
      <div className="relative flex-1">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={sel}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{tr ? tr(o.name) : o.name}</option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute end-8 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
      </div>
      <button onClick={() => setCreating(true)}
        className="shrink-0 rounded-lg bg-[var(--fg)]/5 p-2 text-[var(--fg)] transition-all hover:bg-[var(--fg)] hover:text-[var(--bg-elevated)]"
        title={t("cat.createNew")}>
        <Plus size={14} />
      </button>
    </div>
  );
}
