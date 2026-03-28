"use client";

import { useI18n } from "@/lib/i18n";
import { DoorOpen, X } from "lucide-react";

interface RoomMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  floors: { id: string; name: string; rooms: { id: string; name: string; type: string }[] }[];
  tr: (s: string) => string;
}

export function RoomMultiSelect({ value, onChange, floors, tr }: RoomMultiSelectProps) {
  const { t } = useI18n();
  const allRooms = floors.flatMap((f) => f.rooms.map((r) => ({ ...r, floorName: f.name })));
  const selected = allRooms.filter((r) => value.includes(r.id));
  const available = allRooms.filter((r) => !value.includes(r.id));

  const add = (roomId: string) => onChange([...value, roomId]);
  const remove = (roomId: string) => onChange(value.filter((id) => id !== roomId));

  return (
    <div className="space-y-1.5">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]">
              <DoorOpen size={10} />
              {tr(r.name)}
              <button type="button" onClick={() => remove(r.id)} className="ms-0.5 rounded-full p-0.5 hover:bg-[var(--accent)]/20">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Dropdown to add */}
      {available.length > 0 ? (
        <select
          value=""
          onChange={(e) => { if (e.target.value) add(e.target.value); }}
          className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]"
        >
          <option value="">{t("task.addRoom")}</option>
          {floors.map((f) => {
            const fRooms = f.rooms.filter((r) => !value.includes(r.id));
            if (fRooms.length === 0) return null;
            return (
              <optgroup key={f.id} label={tr(f.name)}>
                {fRooms.map((r) => (
                  <option key={r.id} value={r.id}>{tr(r.name)}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      ) : selected.length > 0 ? (
        <p className="text-[10px] text-[var(--success)]">{t("task.allRooms")}</p>
      ) : null}
    </div>
  );
}
